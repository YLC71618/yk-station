import { useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useI18n, type MessageKey } from '../i18n'
import './LoginScreen.css'

type Step = 'email' | 'code'

export default function LoginScreen({ client, notAllowed }: { client: SupabaseClient; notAllowed: boolean }) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<MessageKey | null>(notAllowed ? 'auth.error.notAllowed' : null)
  const [detail, setDetail] = useState('')

  async function sendCode(e?: FormEvent) {
    e?.preventDefault()
    setBusy(true)
    setError(null)
    setDetail('')
    const { error } = await client.auth.signInWithOtp({ email: email.trim().toLowerCase() })
    setBusy(false)
    if (!error) {
      setStep('code')
      setCode('')
    } else if (error.status === 429) {
      setError('auth.error.rateLimit')
    } else if (/YK_NOT_ALLOWED|database error/i.test(error.message)) {
      // The gate_new_user trigger rejected an email that is not in allowed_users.
      setError('auth.error.notAllowed')
    } else {
      setError('auth.error.generic')
      setDetail(`${error.status ?? ''} ${error.message}`.trim())
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'email' })
    setBusy(false)
    if (error) setError('auth.error.badCode')
  }

  return (
    <main className="login">
      <img className="login__icon" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <h1 className="login__name">{t('app.name')}</h1>

      {step === 'email' ? (
        <form className="login__card" onSubmit={sendCode}>
          <label className="login__label" htmlFor="email">
            {t('auth.email.label')}
          </label>
          <input
            id="email"
            className="login__input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder={t('auth.email.placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="login__button" disabled={busy || !email.includes('@')}>
            {t(busy ? 'auth.sending' : 'auth.email.submit')}
          </button>
        </form>
      ) : (
        <form className="login__card" onSubmit={verify}>
          <p className="login__hint">
            {t('auth.code.sentTo')} <strong>{email}</strong>
          </p>
          <label className="login__label" htmlFor="code">
            {t('auth.code.label')}
          </label>
          <input
            id="code"
            className="login__input login__input--code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
          />
          <button className="login__button" disabled={busy || code.length < 6}>
            {t(busy ? 'auth.verifying' : 'auth.code.submit')}
          </button>
          <div className="login__links">
            <button type="button" className="login__link" onClick={() => setStep('email')}>
              {t('auth.code.changeEmail')}
            </button>
            <button type="button" className="login__link" onClick={() => sendCode()} disabled={busy}>
              {t('auth.code.resend')}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="login__error" role="alert">
          {t(error)}
          {detail && <small className="login__detail">{detail}</small>}
        </p>
      )}
    </main>
  )
}
