import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import LoginScreen from './auth/LoginScreen'
import { t } from './i18n'
import './App.css'

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export default function App() {
  if (!supabase) {
    return (
      <main className="scaffold">
        <p className="scaffold__tagline">{t('scaffold.supabase.missing')}</p>
      </main>
    )
  }
  return (
    <AuthProvider client={supabase}>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { status, notAllowed } = useAuth()
  if (status === 'loading') {
    return (
      <main className="scaffold">
        <img className="scaffold__icon" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      </main>
    )
  }
  if (status === 'signedOut') return <LoginScreen client={supabase!} notAllowed={notAllowed} />
  return <Home />
}

// Placeholder home until the app shell lands in Milestone 2.
function Home() {
  const { profile, session, signOut } = useAuth()
  return (
    <main className="scaffold">
      <img className="scaffold__icon" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <h1 className="scaffold__name">{t('app.name')}</h1>

      <section className="scaffold__card">
        <h2>{t('home.hello').replace('{name}', profile!.display_name)}</h2>
        <p>{t('scaffold.body')}</p>
        <div className="scaffold__row">
          <span>{t('home.account')}</span>
          <span className="scaffold__value">{session!.user.email}</span>
        </div>
        <div className="scaffold__row">
          <span>{t('home.role')}</span>
          <span className="scaffold__value">{t(profile!.role === 'yoyo' ? 'role.yoyo' : 'role.kyle')}</span>
        </div>
        <div className="scaffold__row">
          <span>{t('scaffold.mode')}</span>
          <span className="scaffold__value">
            {t(isStandalone ? 'scaffold.mode.standalone' : 'scaffold.mode.browser')}
          </span>
        </div>
        <button className="scaffold__signout" onClick={signOut}>
          {t('auth.signOut')}
        </button>
      </section>
    </main>
  )
}
