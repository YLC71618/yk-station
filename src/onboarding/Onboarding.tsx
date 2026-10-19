import { useEffect, useState, type ReactNode } from 'react'
import { BearFace } from '../components/Bear'
import { useI18n } from '../i18n'
import { enablePush, isIOS, isStandalone, pushStatus } from '../lib/push'
import './Onboarding.css'

const SKIP_INSTALL = 'yk.skipInstall'
const SKIP_PUSH = 'yk.skipPush'

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function setFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* storage unavailable */
  }
}

type Step = 'checking' | 'install' | 'push' | 'done'

/**
 * First-run steps after sign-in (SPEC §6.7): on an iPhone outside the Home Screen app, teach
 * "Share → Add to Home Screen"; inside it, ask for notifications from a tap. Then the app.
 */
export default function Onboarding({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>('checking')

  useEffect(() => {
    if (isIOS() && !isStandalone() && !readFlag(SKIP_INSTALL)) return setStep('install')
    if (!isStandalone() || readFlag(SKIP_PUSH)) return setStep('done')
    pushStatus().then((s) => setStep(s === 'off' ? 'push' : 'done'))
  }, [])

  if (step === 'checking') return null
  if (step === 'install')
    return (
      <InstallGuide
        onSkip={() => {
          setFlag(SKIP_INSTALL)
          setStep('done')
        }}
      />
    )
  if (step === 'push')
    return (
      <PushPrompt
        onDone={() => {
          setFlag(SKIP_PUSH)
          setStep('done')
        }}
      />
    )
  return <>{children}</>
}

function InstallGuide({ onSkip }: { onSkip: () => void }) {
  const { t } = useI18n()
  return (
    <main className="onboard">
      <div className="onboard__icon">
        <BearFace width={64} height={58} />
      </div>
      <h1 className="onboard__title">{t('onboard.install.title')}</h1>
      <p className="onboard__lead">{t('onboard.install.lead')}</p>
      <ol className="onboard__steps">
        <li>
          <ShareGlyph />
          <span>{t('onboard.install.step1')}</span>
        </li>
        <li>
          <AddGlyph />
          <span>{t('onboard.install.step2')}</span>
        </li>
        <li>
          <HomeGlyph />
          <span>{t('onboard.install.step3')}</span>
        </li>
      </ol>
      <button type="button" className="onboard__skip" onClick={onSkip}>
        {t('onboard.install.skip')}
      </button>
    </main>
  )
}

function PushPrompt({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)

  async function enable() {
    setBusy(true)
    const s = await enablePush().catch(() => 'off' as const)
    setBusy(false)
    if (s === 'denied') return setDenied(true)
    onDone()
  }

  return (
    <main className="onboard">
      <div className="onboard__icon">
        <BearFace width={64} height={58} />
      </div>
      <h1 className="onboard__title">{t('onboard.push.title')}</h1>
      <p className="onboard__lead">{t(denied ? 'push.status.denied' : 'onboard.push.lead')}</p>
      <ul className="onboard__bullets">
        <li>{t('onboard.push.b1')}</li>
        <li>{t('onboard.push.b2')}</li>
        <li>{t('onboard.push.b3')}</li>
      </ul>
      {!denied && (
        <button type="button" className="onboard__primary" onClick={enable} disabled={busy}>
          {t('push.enable')}
        </button>
      )}
      <button type="button" className="onboard__skip" onClick={onDone}>
        {t(denied ? 'onboard.continue' : 'onboard.push.later')}
      </button>
    </main>
  )
}

/* Simple stroke drawings of the iOS controls (no screenshots, no emoji). */
function ShareGlyph() {
  return (
    <svg className="onboard__glyph" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="10" />
      <path d="M13 18v12h14V18" />
      <path d="M20 8v15" />
      <path d="M15.5 12.5L20 8l4.5 4.5" />
    </svg>
  )
}

function AddGlyph() {
  return (
    <svg className="onboard__glyph" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="10" />
      <rect x="11" y="11" width="18" height="18" rx="4" />
      <path d="M20 15v10M15 20h10" />
    </svg>
  )
}

function HomeGlyph() {
  return (
    <svg className="onboard__glyph" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="10" />
      <rect x="9" y="9" width="9" height="9" rx="2.5" />
      <rect x="22" y="9" width="9" height="9" rx="2.5" className="onboard__glyph-hl" />
      <rect x="9" y="22" width="9" height="9" rx="2.5" />
      <rect x="22" y="22" width="9" height="9" rx="2.5" />
    </svg>
  )
}
