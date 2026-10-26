import { useState } from 'react'
import { useI18n } from '../i18n'
import { useWaterContext } from '../water/WaterProvider'
import './SettingsCards.css'

/** Pause / resume the whole water feature (cards, notifications, day-end penalties). */
export default function WaterPauseCard() {
  const { t } = useI18n()
  const { paused, setPaused } = useWaterContext()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      await setPaused(!paused)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="water" className="card card--soft water-pause">
      <div className="water-pause__head">
        <h2 className="settings__heading">{t('water.pause.title')}</h2>
        <span className={`water-pause__state${paused ? ' is-paused' : ''}`}>
          {t(paused ? 'water.pause.paused' : 'water.pause.on')}
        </span>
      </div>
      <p className="muted-small">{t(paused ? 'water.pause.pausedHint' : 'water.pause.onHint')}</p>
      <button type="button" className={paused ? 'pink-button' : 'white-button'} onClick={toggle} disabled={busy}>
        {t(paused ? 'water.pause.resume' : 'water.pause.pause')}
      </button>
    </section>
  )
}
