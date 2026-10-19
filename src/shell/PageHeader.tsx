import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BackIcon } from '../components/icons'
import { useI18n } from '../i18n'
import './PageHeader.css'

type Props = {
  title: string
  /** Small coloured line above the title, e.g. 「又又的分頁」. */
  kicker?: string
  kickerColor?: 'yoyo' | 'kyle' | 'brand'
  /** Shows the round back-to-ward button (every page except the ward). */
  back?: boolean
  /** Right-hand slot: coin pill, settings gear… */
  action?: ReactNode
}

export default function PageHeader({ title, kicker, kickerColor = 'brand', back = true, action }: Props) {
  const { t } = useI18n()
  return (
    <header className="page-header">
      {back && (
        <Link to="/" className="round-button" aria-label={t('nav.backToWard')}>
          <BackIcon />
        </Link>
      )}
      <div className="page-header__titles">
        {kicker && <span className={`page-header__kicker page-header__kicker--${kickerColor}`}>{kicker}</span>}
        <h1 className={back ? 'page-header__title' : 'page-header__title page-header__title--big'}>{title}</h1>
      </div>
      {action}
    </header>
  )
}
