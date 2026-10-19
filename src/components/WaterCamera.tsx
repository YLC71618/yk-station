import { useEffect, useRef, useState } from 'react'
import { bear, coins, water } from '../config/rules'
import { useI18n } from '../i18n'
import { photoStamp } from '../lib/time'
import { CheckCircleIcon } from './icons'
import './WaterCamera.css'

type Step = 'full' | 'empty' | 'uploading' | 'sent' | 'error'

type Props = {
  /** Who reviews this cup, for the "sent to …" message. */
  reviewerName: string
  /** Uploads both photos and creates the log. */
  onSubmit: (full: Blob, empty: Blob) => Promise<void>
  onClose: () => void
  /** Only Yoyo's cups feed the bear. */
  feedsBear: boolean
}

/** Live camera only (getUserMedia): no file input and no photo library, per SPEC §5. */
export default function WaterCamera({ reviewerName, onSubmit, onClose, feedsBear }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fullRef = useRef<Blob | null>(null)
  const [step, setStep] = useState<Step>('full')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((tr) => tr.stop())
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => {
        setError(t('camera.denied'))
        setStep('error')
      })
    if (!navigator.mediaDevices) {
      setError(t('camera.unsupported'))
      setStep('error')
    }
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
    }
  }, [t])

  async function shoot() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const blob = await capture(video)
    if (step === 'full') {
      fullRef.current = blob
      setStep('empty')
      return
    }
    setStep('uploading')
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    try {
      await onSubmit(fullRef.current!, blob)
      setStep('sent')
    } catch {
      setError(t('camera.uploadFailed'))
      setStep('error')
    }
  }

  const shooting = step === 'full' || step === 'empty'

  return (
    <div className="cam" role="dialog" aria-modal="true" aria-label={t('camera.title')}>
      <span className="cam__step">
        {step === 'full' ? t('camera.step', { n: 1 }) : step === 'empty' ? t('camera.step', { n: 2 }) : ''}
      </span>
      <h2 className="cam__title">
        {step === 'full' ? t('camera.full') : step === 'empty' ? t('camera.empty') : step === 'uploading' ? t('camera.uploading') : ''}
      </h2>

      <div className="cam__frame">
        {shooting && <video ref={videoRef} className="cam__video" autoPlay playsInline muted />}
        {step === 'sent' && (
          <div className="cam__sent">
            <CheckCircleIcon />
            <strong>{t('camera.sent', { who: reviewerName })}</strong>
            <span>
              {t(feedsBear ? 'camera.sentHintBear' : 'camera.sentHint', {
                coins: coins.waterCupApproved,
                water: bear.water.approvedCup,
              })}
            </span>
          </div>
        )}
        {step === 'error' && <p className="cam__error">{error}</p>}
        <span className="cam__badge">{t('camera.liveOnly')}</span>
      </div>

      {shooting && <button type="button" className="cam__shutter" onClick={shoot} aria-label={t('camera.shoot')} />}
      {(step === 'sent' || step === 'error') && (
        <button type="button" className="cam__done" onClick={onClose}>
          {t(step === 'sent' ? 'camera.done' : 'camera.close')}
        </button>
      )}
      {shooting && (
        <button type="button" className="cam__cancel" onClick={onClose}>
          {t('camera.cancel')}
        </button>
      )}
    </div>
  )
}

/** Grab the current frame: max side water.photoMaxPx, timestamp overlay, JPEG at water.photoJpegQuality. */
function capture(video: HTMLVideoElement): Promise<Blob> {
  const scale = Math.min(1, water.photoMaxPx / Math.max(video.videoWidth, video.videoHeight))
  const w = Math.round(video.videoWidth * scale)
  const h = Math.round(video.videoHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0, w, h)

  const size = Math.round(w / 22)
  ctx.font = `700 ${size}px Fredoka, sans-serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.lineWidth = size / 5
  ctx.strokeStyle = 'rgba(0,0,0,0.65)'
  ctx.fillStyle = '#FFFFFF'
  const stamp = photoStamp()
  ctx.strokeText(stamp, w - size / 2, h - size / 2)
  ctx.fillText(stamp, w - size / 2, h - size / 2)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/jpeg', water.photoJpegQuality),
  )
}
