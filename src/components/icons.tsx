// Inline stroke icons from the mockups (24×24, currentColor).
import type { SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

type IconProps = { size?: number }

export function BackIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.4}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function GearIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export function BowlIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M3 11h18a9 9 0 0 1-18 0z" />
      <path d="M8 7c0-1.5 1-2 1-3.5" />
      <path d="M12 7c0-1.5 1-2 1-3.5" />
      <path d="M16 7c0-1.5 1-2 1-3.5" />
    </svg>
  )
}

export function CartIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2.5 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L22 7H6.2" />
    </svg>
  )
}
