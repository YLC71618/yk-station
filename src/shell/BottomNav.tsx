import { NavLink } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { BearFace } from '../components/Bear'
import { BowlIcon, CartIcon } from '../components/icons'
import { useI18n } from '../i18n'
import './BottomNav.css'

const tabClass = (variant: string) => ({ isActive }: { isActive: boolean }) =>
  `nav__tab nav__tab--${variant}${isActive ? ' nav__tab--active' : ''}`

export default function BottomNav() {
  const { t } = useI18n()
  return (
    <nav className="nav" aria-label={t('nav.menu')}>
      <div className="nav__bar">
        <NavLink to="/yoyo" className={tabClass('yoyo')}>
          <Avatar role="yoyo" size={26} ring="role" />
          {t('role.yoyo')}
        </NavLink>
        <NavLink to="/food" className={tabClass('plain')}>
          <BowlIcon />
          {t('nav.food')}
        </NavLink>
        <span aria-hidden="true" />
        <NavLink to="/lists" className={tabClass('plain')}>
          <CartIcon />
          {t('nav.lists')}
        </NavLink>
        <NavLink to="/kyle" className={tabClass('kyle')}>
          <Avatar role="kyle" size={26} ring="role" />
          {t('role.kyle')}
        </NavLink>
      </div>
      <NavLink to="/" end className="nav__ward" aria-label={t('nav.ward')}>
        <BearFace />
        {t('nav.ward')}
      </NavLink>
    </nav>
  )
}
