import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import WaterCamera from '../components/WaterCamera'
import { BellIcon } from '../components/icons'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useWater } from '../lib/useWater'
import './WaterProvider.css'

type WaterState = ReturnType<typeof useWater> & { openCamera: () => void }

const WaterContext = createContext<WaterState | null>(null)

/** One shared water subscription + the camera + Yoyo's full-screen request card. */
export function WaterProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { profile } = useAuth()
  const me = profile!.role
  const water = useWater()
  const [cameraOpen, setCameraOpen] = useState(false)
  const [now, setNow] = useState(Date.now())

  // Re-show the request card when a snooze runs out.
  const snoozedUntil = water.request?.snoozed_until ? new Date(water.request.snoozed_until).getTime() : 0
  useEffect(() => {
    if (snoozedUntil <= Date.now()) return
    const id = window.setTimeout(() => setNow(Date.now()), snoozedUntil - Date.now() + 500)
    return () => window.clearTimeout(id)
  }, [snoozedUntil])

  const showRequest = me === 'yoyo' && !!water.request && snoozedUntil <= now && !cameraOpen

  async function snooze() {
    await water.snooze()
    setNow(Date.now())
  }

  return (
    <WaterContext.Provider value={{ ...water, openCamera: () => setCameraOpen(true) }}>
      {children}

      {showRequest && (
        <div className="request-overlay" role="alertdialog" aria-modal="true" aria-labelledby="request-title">
          <div className="request-card request-card--big">
            <div className="request-card__head">
              <BellIcon size={28} />
              <h2 id="request-title">{t('water.request.title')}</h2>
            </div>
            <p>{t('water.request.hint')}</p>
            <button type="button" className="request-card__go" onClick={() => setCameraOpen(true)}>
              {t('water.request.go')}
            </button>
            <button type="button" className="request-card__snooze" onClick={snooze} disabled={water.snoozesLeft <= 0}>
              {water.snoozesLeft > 0 ? t('water.request.snooze', { n: water.snoozesLeft }) : t('water.request.noSnooze')}
            </button>
          </div>
        </div>
      )}

      {cameraOpen && (
        <WaterCamera
          reviewerName={t(me === 'yoyo' ? 'role.kyle' : 'role.yoyo')}
          feedsBear={me === 'yoyo'}
          onSubmit={(full, empty) => water.submit(me, full, empty)}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </WaterContext.Provider>
  )
}

export function useWaterContext() {
  const ctx = useContext(WaterContext)
  if (!ctx) throw new Error('useWaterContext must be used inside WaterProvider')
  return ctx
}
