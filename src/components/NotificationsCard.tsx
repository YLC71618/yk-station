import { useEffect, useState } from 'react'
import { useI18n, type MessageKey } from '../i18n'
import { enablePush, pushStatus, sendTestPush, type PushStatus } from '../lib/push'
import { BellIcon } from './icons'
import './NotificationsCard.css'

const STATUS_TEXT: Record<PushStatus, MessageKey> = {
  on: 'push.status.on',
  off: 'push.status.off',
  denied: 'push.status.denied',
  install: 'push.status.install',
  unsupported: 'push.status.unsupported',
}

/** Notification status + (re-)enable button + test button. */
export default function NotificationsCard() {
  const { t } = useI18n()
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    pushStatus().then(setStatus)
  }, [])

  async function enable() {
    setBusy(true)
    try {
      setStatus(await enablePush())
    } catch {
      setNote(t('auth.error.generic'))
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    await sendTestPush()
    setNote(t('push.testSent'))
  }

  return (
    <section className="card notif">
      <div className="notif__head">
        <BellIcon />
        <h2 className="settings__heading">{t('push.title')}</h2>
        {status && <span className={`notif__dot notif__dot--${status === 'on' ? 'on' : 'off'}`} />}
      </div>
      <p className="notif__text">{status ? t(STATUS_TEXT[status]) : '…'}</p>
      {(status === 'off' || status === 'on') && (
        <div className="notif__actions">
          <button type="button" className="notif__button" onClick={enable} disabled={busy}>
            {t(status === 'on' ? 'push.reenable' : 'push.enable')}
          </button>
          {status === 'on' && (
            <button type="button" className="notif__button notif__button--soft" onClick={test}>
              {t('push.test')}
            </button>
          )}
        </div>
      )}
      {note && <p className="notif__note">{note}</p>}
    </section>
  )
}
