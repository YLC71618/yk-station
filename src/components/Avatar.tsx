import type { Role } from '../lib/supabase'
import { ink } from '../styles/illustration'
import './Avatar.css'

// Drawings from assets/avatar-yoyo.svg and assets/avatar-kyle.svg (viewBox 0 0 100 100).
function YoyoDrawing() {
  return (
    <>
      <g stroke={ink.outline} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        <path d="M20 50 C17 24 33 11 50 11 C67 11 83 24 80 50 C80 62 85 74 81 86 C78 90 73 88 71 84 C70 89 65 90 63 86 L37 86 C35 90 30 89 29 84 C27 88 22 90 19 86 C15 74 20 62 20 50 Z" fill={ink.hairYoyo} />
        <path d="M24 101 C26 90 36 85.5 44 85 L56 85 C64 85.5 74 90 76 101 Z" fill={ink.shirtYoyo} />
        <path d="M45.5 72 L54.5 72 L54.5 85.5 Q50 88.5 45.5 85.5 Z" fill={ink.neck} />
        <path d="M28.5 45 C28.5 33.5 38.5 28.5 50 28.5 C61.5 28.5 71.5 33.5 71.5 45 C73.5 56 71.5 67 64 73 C60 76.2 55 77.2 50 77.2 C45 77.2 40 76.2 36 73 C28.5 67 26.5 56 28.5 45 Z" fill={ink.skin} />
        <path d="M26 50 C23 27 36 16 50 16 C64 16 77 27 74 50 C72.5 43.5 69.5 38.5 64 35.5 C61 40.5 55.5 43.5 49 44.5 C51 40.5 51 37.5 50 35.5 C45 40.5 38.5 44 31.5 46 C29 47 27.5 48.5 26 50 Z" fill={ink.hairYoyo} />
        <path d="M26 48 C24 61 25 73 29.5 83.5 C31.5 85.5 34 85 35 82.5 C31.5 73 29.8 62 30 50 Z" fill={ink.hairYoyo} />
        <path d="M74 48 C76 61 75 73 70.5 83.5 C68.5 85.5 66 85 65 82.5 C68.5 73 70.2 62 70 50 Z" fill={ink.hairYoyo} />
      </g>
      <g stroke={ink.outline} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M42 21 Q37 29 35 38" />
        <path d="M57 20 Q61 27 62 33" />
        <path d="M22 60 Q21 70 23 78" />
        <path d="M78 60 Q79 70 77 78" />
      </g>
      <g transform="translate(68 20) rotate(20)" stroke={ink.outline} strokeWidth="1.4" strokeLinejoin="round">
        <path d="M0 0 C-5 -8 -13 -6.5 -11.5 0.5 C-10.5 5 -5 4 0 1 Z" fill={ink.bow} />
        <path d="M0 0 C5 -8 13 -6.5 11.5 0.5 C10.5 5 5 4 0 1 Z" fill={ink.bow} />
        <circle cx="0" cy="0.5" r="2.6" fill={ink.bowKnot} />
      </g>
      <ellipse cx="40" cy="56" rx="2.9" ry="3.6" fill={ink.eye} />
      <ellipse cx="60" cy="56" rx="2.9" ry="3.6" fill={ink.eye} />
      <circle cx="41" cy="54.6" r="1" fill={ink.white} />
      <circle cx="61" cy="54.6" r="1" fill={ink.white} />
      <path d="M36.5 53 L35 52" stroke={ink.eye} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M63.5 53 L65 52" stroke={ink.eye} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="34" cy="63.5" rx="5" ry="3" fill={ink.cheek} opacity="0.55" />
      <ellipse cx="66" cy="63.5" rx="5" ry="3" fill={ink.cheek} opacity="0.55" />
      <g stroke={ink.cheekLines} strokeWidth="1" strokeLinecap="round">
        <path d="M31.5 64.5 L33 62" />
        <path d="M34 64.5 L35.5 62" />
        <path d="M63.5 64.5 L65 62" />
        <path d="M66 64.5 L67.5 62" />
      </g>
      <path d="M47 65.5 Q50 68.5 53 65.5" stroke={ink.outline} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  )
}

function KyleDrawing() {
  return (
    <>
      <g stroke={ink.outline} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        <path d="M24 101 C26 90 36 85.5 44 85 L56 85 C64 85.5 74 90 76 101 Z" fill={ink.shirtKyle} />
        <path d="M43.5 85 Q50 90 56.5 85" fill={ink.white} />
        <path d="M45.5 72 L54.5 72 L54.5 85.5 Q50 88.5 45.5 85.5 Z" fill={ink.neck} />
        <path d="M27.5 51 C24 50 23.5 60 28.5 61.5" fill={ink.neck} />
        <path d="M72.5 51 C76 50 76.5 60 71.5 61.5" fill={ink.neck} />
        <path d="M28.5 45 C28.5 33.5 38.5 28.5 50 28.5 C61.5 28.5 71.5 33.5 71.5 45 C73.5 56 71.5 67 64 73 C60 76.2 55 77.2 50 77.2 C45 77.2 40 76.2 36 73 C28.5 67 26.5 56 28.5 45 Z" fill={ink.skin} />
        <path d="M27 51 C23 30 34 17 50 17 C55 14 60 13.5 63 14.5 C61 15.5 60 16.5 59.5 18 C70 21 77 31 73.5 49 C72 44 70 40.5 67 38 C66 40.5 64 42 61.5 43 C62 40.5 61.5 38 60.5 36.5 C55 39.5 48.5 41.5 42 42.5 C43 40.5 43 38.5 42.5 37 C37 40.5 32 45 29 51 C28.5 50.5 27.8 50.5 27 51 Z" fill={ink.hairKyle} />
      </g>
      <g stroke={ink.outline} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.6">
        <path d="M45 22 Q41 28 39 34" />
        <path d="M58 22 Q62 27 64 32" />
      </g>
      <path d="M27.5 54.5 Q26.5 56 27.8 57.5" stroke={ink.earShade} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M72.5 54.5 Q73.5 56 72.2 57.5" stroke={ink.earShade} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <ellipse cx="40.5" cy="56.5" rx="2.6" ry="3.2" fill={ink.eye} />
      <ellipse cx="59.5" cy="56.5" rx="2.6" ry="3.2" fill={ink.eye} />
      <circle cx="41.4" cy="55.3" r="0.9" fill={ink.white} />
      <circle cx="60.4" cy="55.3" r="0.9" fill={ink.white} />
      <g stroke={ink.glasses} strokeWidth="1.5" fill={ink.white} fillOpacity="0.15">
        <circle cx="40.5" cy="56.5" r="7.8" />
        <circle cx="59.5" cy="56.5" r="7.8" />
      </g>
      <g stroke={ink.glasses} strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M48.3 55.5 Q50 54.2 51.7 55.5" />
        <path d="M32.7 55.5 L28.5 54.5" />
        <path d="M67.3 55.5 L71.5 54.5" />
      </g>
      <ellipse cx="33.5" cy="66" rx="4.6" ry="2.7" fill={ink.cheek} opacity="0.45" />
      <ellipse cx="66.5" cy="66" rx="4.6" ry="2.7" fill={ink.cheek} opacity="0.45" />
      <g stroke={ink.cheekLines} strokeWidth="1" strokeLinecap="round">
        <path d="M31.5 67 L33 64.5" />
        <path d="M34 67 L35.5 64.5" />
        <path d="M64.5 67 L66 64.5" />
        <path d="M67 67 L68.5 64.5" />
      </g>
      <path d="M46.5 67 Q50 70.5 53.5 67" stroke={ink.outline} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  )
}

type AvatarProps = {
  role: Role
  /** Outer diameter in px. */
  size?: number
  /** 'face' crops to the head (used in chips and the nav); 'full' shows the shoulders too. */
  crop?: 'face' | 'full'
  /** Ring colour: the brown outline (default) or the person's own colour. */
  ring?: 'brown' | 'role'
  label?: string
}

export default function Avatar({ role, size = 40, crop = 'face', ring = 'brown', label }: AvatarProps) {
  return (
    <span
      className={`avatar avatar--${role} ${ring === 'role' ? 'avatar--role-ring' : ''}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox={crop === 'face' ? '18 8 64 64' : '0 0 100 100'} width="100%" height="100%">
        {role === 'yoyo' ? <YoyoDrawing /> : <KyleDrawing />}
      </svg>
    </span>
  )
}
