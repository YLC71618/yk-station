import { useEffect, useState } from 'react'
import { checkSupabase, supabase } from './lib/supabase'
import { t, type MessageKey } from './i18n'
import './App.css'

type DbState = 'missing' | 'checking' | 'ok' | 'error'

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export default function App() {
  const [db, setDb] = useState<DbState>(supabase ? 'checking' : 'missing')

  useEffect(() => {
    if (!supabase) return
    checkSupabase().then((ok) => setDb(ok ? 'ok' : 'error'))
  }, [])

  const dbClass = db === 'ok' ? 'scaffold__value--ok' : db === 'checking' ? '' : 'scaffold__value--bad'

  return (
    <main className="scaffold">
      <img className="scaffold__icon" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <h1 className="scaffold__name">{t('app.name')}</h1>
      <p className="scaffold__tagline">{t('app.tagline')}</p>

      <section className="scaffold__card">
        <h2>{t('scaffold.title')}</h2>
        <p>{t('scaffold.body')}</p>
        <div className="scaffold__row">
          <span>{t('scaffold.mode')}</span>
          <span className="scaffold__value">
            {t(isStandalone ? 'scaffold.mode.standalone' : 'scaffold.mode.browser')}
          </span>
        </div>
        <div className="scaffold__row">
          <span>{t('scaffold.supabase')}</span>
          <span className={`scaffold__value ${dbClass}`}>{t(`scaffold.supabase.${db}` as MessageKey)}</span>
        </div>
      </section>
    </main>
  )
}
