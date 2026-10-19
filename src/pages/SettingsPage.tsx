import PageHeader from '../shell/PageHeader'
import Avatar from '../components/Avatar'
import NotificationsCard from '../components/NotificationsCard'
import { useAuth } from '../auth/AuthProvider'
import { useI18n, type Lang } from '../i18n'
import './SettingsPage.css'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'en-GB', label: 'English (UK)' },
]

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const { profile, session, signOut, updateProfile } = useAuth()

  function pick(value: Lang) {
    setLang(value)
    updateProfile({ lang: value })
  }

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="page-body">
        <section className="card settings__account">
          <Avatar role={profile!.role} size={52} />
          <div className="settings__who">
            <strong>{t(profile!.role === 'yoyo' ? 'role.yoyo' : 'role.kyle')}</strong>
            <span>{session!.user.email}</span>
          </div>
          <button className="settings__signout" onClick={signOut}>
            {t('auth.signOut')}
          </button>
        </section>

        <section className="card">
          <h2 className="settings__heading">{t('settings.language')}</h2>
          <div className="settings__segmented" role="radiogroup" aria-label={t('settings.language')}>
            {LANGS.map((l) => (
              <button
                key={l.value}
                role="radio"
                aria-checked={lang === l.value}
                className={lang === l.value ? 'is-on' : ''}
                onClick={() => pick(l.value)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>

        <NotificationsCard />

        <p className="placeholder">{t('common.comingSoon', { n: 9 })}</p>
      </div>
    </>
  )
}
