import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { Role } from '../lib/supabase'
import { hhmm, isToday } from '../lib/time'
import { signedPhotoUrls, type WaterLog } from '../lib/useWater'
import { coins, water } from '../config/rules'
import { useWaterContext } from './WaterProvider'
import { BellIcon, CameraIcon, DropIcon } from '../components/icons'
import './WaterParts.css'

/** Goal drops: filled = approved, light = waiting for review. */
export function Drops({ approved, pending }: { approved: number; pending: number }) {
  return (
    <div className="drops" aria-hidden="true">
      {Array.from({ length: water.dailyGoalYoyo }, (_, i) => (
        <svg key={i} viewBox="0 0 24 30" width="100%" height="30">
          <path
            d="M12 3 C16 9 20 13 20 18.5 A8 8 0 0 1 4 18.5 C4 13 8 9 12 3 Z"
            className={i < approved ? 'drop--full' : i < approved + pending ? 'drop--pending' : 'drop--empty'}
            strokeWidth="1.6"
          />
        </svg>
      ))}
    </div>
  )
}

/** 「今天的喝水」 / 「我的喝水」 card. Camera button only for the owner. */
export function CupsCard({ owner, me, title }: { owner: Role; me: Role; title: string }) {
  const { t } = useI18n()
  const { count, openCamera } = useWaterContext()
  const { approved, pending } = count(owner)
  const reviewer = t(owner === 'yoyo' ? 'role.kyle' : 'role.yoyo')
  return (
    <section className="card water-card">
      <div className="water-card__top">
        <h2 className="section-title">{title}</h2>
        <span className="water-card__count">
          {approved} <small>{t('water.ofGoal', { n: water.dailyGoalYoyo })}</small>
        </span>
      </div>
      {owner === 'yoyo' && <Drops approved={approved} pending={pending} />}
      {pending > 0 && <span className="muted-small">{t('water.pending', { n: pending, who: reviewer })}</span>}
      {owner === me && (
        <button type="button" className={`big-button big-button--${owner}`} onClick={openCamera}>
          <CameraIcon />
          {t(owner === 'yoyo' ? 'water.selfShoot' : 'water.shootForReview')}
        </button>
      )}
    </section>
  )
}

/** Yoyo's in-page request card (the full-screen one appears when the app opens). */
export function RequestCard() {
  const { t } = useI18n()
  const { request, snoozesLeft, snooze, decline, openCamera, goalMet } = useWaterContext()
  if (!request) return null
  const snoozed = request.snoozed_until && new Date(request.snoozed_until).getTime() > Date.now()

  if (goalMet) {
    return (
      <section className="request-card request-card--optional">
        <div className="request-card__head">
          <BellIcon />
          <h2>{t('water.request.optionalTitle')}</h2>
        </div>
        <p>{t('water.request.optionalHint', { goal: water.dailyGoalYoyo })}</p>
        <div className="request-card__actions">
          <button type="button" className="request-card__go" onClick={openCamera}>
            {t('water.request.accept', { coins: coins.waterCupApproved + coins.extraCupBonus })}
          </button>
          <button type="button" className="request-card__snooze" onClick={() => decline()}>
            {t('water.request.decline')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="request-card">
      <div className="request-card__head">
        <BellIcon />
        <h2>{t('water.request.title')}</h2>
      </div>
      <p>{snoozed ? t('water.request.snoozedUntil', { time: hhmm(request.snoozed_until!) }) : t('water.request.hint')}</p>
      <div className="request-card__actions">
        <button type="button" className="request-card__go" onClick={openCamera}>
          {t('water.request.go')}
        </button>
        <button type="button" className="request-card__snooze" onClick={() => snooze()} disabled={snoozesLeft <= 0 || !!snoozed}>
          {snoozesLeft > 0 ? t('water.request.snooze', { n: snoozesLeft }) : t('water.request.noSnooze')}
        </button>
      </div>
    </section>
  )
}

/** Kyle's 「叫又又喝水」, shown on Yoyo's tab. */
export function PingButton({ onResult }: { onResult: (msg: string) => void }) {
  const { t } = useI18n()
  const { requestWater, request } = useWaterContext()
  const [busy, setBusy] = useState(false)

  async function ping() {
    setBusy(true)
    try {
      const res = await requestWater()
      onResult(t(res.existing ? 'water.ping.again' : 'water.ping.sent'))
    } catch {
      onResult(t('auth.error.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="ping-button" onClick={ping} disabled={busy}>
      <DropIcon />
      <span>
        <strong>{t('water.ping.title')}</strong>
        <small>{request ? t('water.ping.open') : t('water.ping.hint')}</small>
      </span>
    </button>
  )
}

/** Pending logs of `owner`, reviewed by the other person. Read-only for anyone else. */
export function ReviewList({ owner, me, onResult }: { owner: Role; me: Role; onResult: (msg: string) => void }) {
  const { t } = useI18n()
  const { pendingFor, review } = useWaterContext()
  const items = pendingFor(owner)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const canReview = me !== owner

  const paths = items.flatMap((i) => [i.full_path, i.empty_path]).join('|')
  useEffect(() => {
    if (paths) signedPhotoUrls(paths.split('|')).then(setUrls)
  }, [paths])

  if (!items.length) return null
  const ownerName = t(owner === 'yoyo' ? 'role.yoyo' : 'role.kyle')
  const reviewerName = t(owner === 'yoyo' ? 'role.kyle' : 'role.yoyo')

  async function act(log: WaterLog, approve: boolean) {
    setBusy(log.id)
    try {
      const res = await review(log.id, approve)
      onResult(
        res.ok
          ? t(approve ? 'water.review.approved' : 'water.review.rejected', { who: ownerName, coins: coins.waterCupApproved })
          : t('auth.error.generic'),
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className={`card review review--${owner}`}>
      <h2 className="section-title">{t('water.review.title', { who: ownerName, reviewer: reviewerName })}</h2>
      {!canReview && <span className="muted-small">{t('water.review.ownerHint', { reviewer: reviewerName })}</span>}
      {items.map((log) => (
        <div key={log.id} className="review__row">
          <div className="review__photos">
            <Photo url={urls[log.full_path]} label={t('water.review.full')} />
            <Photo url={urls[log.empty_path]} label={t('water.review.empty')} />
          </div>
          <span className="review__time">
            {t(isToday(log.created_at) ? 'water.review.sentToday' : 'water.review.sentEarlier', { time: hhmm(log.created_at) })}
          </span>
          {canReview && (
            <>
              <button type="button" className="review__ok" disabled={busy === log.id} onClick={() => act(log, true)}>
                {t('water.review.approve')}
              </button>
              <button type="button" className="review__no" disabled={busy === log.id} onClick={() => act(log, false)}>
                {t('water.review.reject')}
              </button>
            </>
          )}
        </div>
      ))}
    </section>
  )
}

function Photo({ url, label }: { url?: string; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="review__photo" onClick={() => url && setOpen(true)} aria-label={label}>
        {url ? <img src={url} alt={label} /> : <span />}
      </button>
      {open && url && (
        <div className="photo-zoom" role="dialog" aria-modal="true" aria-label={label} onClick={() => setOpen(false)}>
          <img src={url} alt={label} />
        </div>
      )}
    </>
  )
}
