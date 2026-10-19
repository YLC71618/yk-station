import type { ReactNode } from 'react'
import './PageHeader.css'

type Props = {
  title: string
  /** Small coloured line above the title, e.g. 「又又的分頁」. */
  kicker?: string
  kickerColor?: 'yoyo' | 'kyle' | 'brand'
  /** Bigger title, used on the ward (home). */
  big?: boolean
  /** Right-hand slot: coin pill, settings gear… */
  action?: ReactNode
}

// No back button: the ward is the home tab and is always one tap away in the bottom nav.
export default function PageHeader({ title, kicker, kickerColor = 'brand', big = false, action }: Props) {
  return (
    <header className="page-header">
      <div className="page-header__titles">
        {kicker && <span className={`page-header__kicker page-header__kicker--${kickerColor}`}>{kicker}</span>}
        <h1 className={big ? 'page-header__title page-header__title--big' : 'page-header__title'}>{title}</h1>
      </div>
      {action}
    </header>
  )
}
