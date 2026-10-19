import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import './AppShell.css'

export default function AppShell() {
  const { pathname } = useLocation()
  // Kyle's tab has its own cool background (SPEC §8).
  const tone = pathname.startsWith('/kyle') ? 'shell--kyle' : ''
  return (
    <div className={`shell ${tone}`}>
      <main className="shell__content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
