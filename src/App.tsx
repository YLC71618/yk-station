import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import LoginScreen from './auth/LoginScreen'
import { I18nProvider, useI18n } from './i18n'
import AppShell from './shell/AppShell'
import WardPage from './pages/WardPage'
import SettingsPage from './pages/SettingsPage'
import CalendarPage from './pages/CalendarPage'
import YoyoPage from './pages/YoyoPage'
import KylePage from './pages/KylePage'
import FoodPage from './pages/FoodPage'
import ListsPage from './pages/ListsPage'
import { WaterProvider } from './water/WaterProvider'
import Onboarding from './onboarding/Onboarding'
import './App.css'

export default function App() {
  return (
    <I18nProvider>
      {supabase ? (
        <AuthProvider client={supabase}>
          <Gate />
        </AuthProvider>
      ) : (
        <MissingConfig />
      )}
    </I18nProvider>
  )
}

function MissingConfig() {
  const { t } = useI18n()
  return (
    <div className="splash">
      <p>{t('config.missing')}</p>
    </div>
  )
}

function Gate() {
  const { status, notAllowed, profile } = useAuth()
  const { setLang } = useI18n()

  // The language follows the profile, so it is the same on every device.
  const profileLang = profile?.lang
  useEffect(() => {
    if (profileLang) setLang(profileLang)
  }, [profileLang, setLang])

  if (status === 'loading') {
    return (
      <div className="splash">
        <img className="splash__icon" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      </div>
    )
  }
  if (status === 'signedOut') return <LoginScreen client={supabase!} notAllowed={notAllowed} />

  return (
    // BASE_URL is "/yk-station/" on GitHub Pages, "/" locally.
    <Onboarding>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <WaterProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<WardPage />} />
          <Route path="yoyo" element={<YoyoPage />} />
          <Route path="kyle" element={<KylePage />} />
          <Route path="food" element={<FoodPage />} />
          <Route path="lists" element={<ListsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </WaterProvider>
    </BrowserRouter>
    </Onboarding>
  )
}
