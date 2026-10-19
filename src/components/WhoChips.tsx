import type { Role } from '../lib/supabase'
import './WhoChips.css'

/** 又又 / 鍇鍇 toggle chips in each person's colour. */
export default function WhoChips({
  value,
  onChange,
  label,
}: {
  value: Role
  onChange: (r: Role) => void
  label: (r: Role) => string
}) {
  return (
    <div className="who-chips">
      {(['yoyo', 'kyle'] as const).map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          className={`who-chip who-chip--${r}${value === r ? ' is-on' : ''}`}
          onClick={() => onChange(r)}
        >
          {label(r)}
        </button>
      ))}
    </div>
  )
}
