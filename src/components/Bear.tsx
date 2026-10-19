import { ink } from '../styles/illustration'

/** The bear face from the app icon and the centre nav button (viewBox 0 0 60 54). */
export function BearFace({ width = 38, height = 34 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 60 54" aria-hidden="true">
      <g stroke={ink.outline} strokeWidth="2.4">
        <circle cx="13" cy="13" r="8" fill={ink.fur} />
        <circle cx="47" cy="13" r="8" fill={ink.fur} />
        <circle cx="30" cy="30" r="22" fill={ink.fur} />
      </g>
      <circle cx="13" cy="13" r="4" fill={ink.earInner} />
      <circle cx="47" cy="13" r="4" fill={ink.earInner} />
      <ellipse cx="30" cy="38" rx="7.5" ry="5.5" fill={ink.muzzle} />
      <ellipse cx="30" cy="35.5" rx="2.4" ry="1.7" fill={ink.nose} />
      <circle cx="21" cy="30" r="2.4" fill={ink.eye} />
      <circle cx="39" cy="30" r="2.4" fill={ink.eye} />
    </svg>
  )
}

const blanketHeart = (x: number, y: number) =>
  `M${x} ${y} a3 3 0 0 1 5 -2 a3 3 0 0 1 5 2 c0 3 -5 6 -5 6 s-5 -3 -5 -6z`

/** Bear in the hospital bed from design/Main.dc.html. `sick` shows plaster, thermometer and sweat; healthy shows happy eyes and hearts. */
export function BearInBed({ sick, label, width = 300 }: { sick: boolean; label: string; width?: number }) {
  return (
    <svg width={width} height={(width * 160) / 220} viewBox="0 0 220 160" role="img" aria-label={label}>
      <g stroke={ink.outline} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M14 150 L14 72 M206 150 L206 94" fill="none" />
        <circle cx="14" cy="68" r="7" fill={ink.iv} />
        <rect x="10" y="112" width="200" height="20" rx="8" fill={ink.white} />
        <path d="M14 132 L14 150 M206 132 L206 150" fill="none" />
        <path d="M28 98 C28 86 50 82 62 86 C70 88 72 98 66 103 C56 108 32 108 28 98 Z" fill={ink.white} />
        <ellipse cx="100" cy="108" rx="32" ry="16" fill={ink.fur} />
        <circle cx="73" cy="35" r="11.5" fill={ink.fur} />
        <circle cx="127" cy="35" r="11.5" fill={ink.fur} />
        <circle cx="100" cy="64" r="35" fill={ink.fur} />
        <path d="M44 112 C52 100 78 101 100 102 C124 101 156 99 180 104 C190 106 196 109 196 115 L196 124 C150 130 74 130 40 124 C38 119 40 115 44 112 Z" fill={ink.blanket} />
        <ellipse cx="82" cy="104" rx="8" ry="5.5" fill={ink.fur} />
        <ellipse cx="118" cy="104" rx="8" ry="5.5" fill={ink.fur} />
      </g>
      <circle cx="73" cy="35" r="6" fill={ink.earInner} />
      <circle cx="127" cy="35" r="6" fill={ink.earInner} />
      <ellipse cx="100" cy="76" rx="11" ry="8" fill={ink.muzzle} />
      <ellipse cx="100" cy="72.5" rx="3.4" ry="2.4" fill={ink.nose} />
      <path d="M96 77 Q98 79.5 100 77 Q102 79.5 104 77" stroke={ink.nose} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="78" cy="76" rx="5.5" ry="3.2" fill={ink.blush} opacity="0.65" />
      <ellipse cx="122" cy="76" rx="5.5" ry="3.2" fill={ink.blush} opacity="0.65" />

      {sick ? (
        <>
          <circle cx="86" cy="66" r="3.4" fill={ink.eye} />
          <circle cx="114" cy="66" r="3.4" fill={ink.eye} />
          <circle cx="87.1" cy="64.9" r="1.1" fill={ink.white} />
          <circle cx="115.1" cy="64.9" r="1.1" fill={ink.white} />
          <g transform="translate(116 44) rotate(-25)">
            <rect x="-9" y="-3.5" width="18" height="7" rx="3.5" fill={ink.plaster} stroke={ink.outline} strokeWidth="1.4" />
            <path d="M-2 -1.5 L-2 1.5 M2 -1.5 L2 1.5" stroke={ink.plasterDots} strokeWidth="1.2" />
          </g>
          <g transform="translate(104 79) rotate(28)">
            <rect x="0" y="-1.6" width="18" height="3.2" rx="1.6" fill={ink.white} stroke={ink.outline} strokeWidth="1.3" />
            <circle cx="17.5" cy="0" r="2.3" fill={ink.heart} stroke={ink.outline} strokeWidth="1.3" />
          </g>
          <path d="M140 52 Q137 57 140 59 Q143 57 140 52 Z" fill={ink.sweat} stroke={ink.sweatLine} strokeWidth="1" />
        </>
      ) : (
        <>
          <path d="M82 67 Q86 63 90 67" stroke={ink.eye} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M110 67 Q114 63 118 67" stroke={ink.eye} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d={blanketHeart(138, 40)} fill={ink.heart} />
          <path d="M148 26 a2.4 2.4 0 0 1 4 -1.6 a2.4 2.4 0 0 1 4 1.6 c0 2.4 -4 4.8 -4 4.8 s-4 -2.4 -4 -4.8z" fill={ink.heartSoft} />
        </>
      )}

      <g fill={ink.white} opacity="0.9">
        <path d={blanketHeart(58, 116)} />
        <path d={blanketHeart(140, 115)} />
        <path d={blanketHeart(172, 112)} />
      </g>
      <g transform="translate(158 30)">
        <rect x="0" y="0" width="36" height="42" rx="6" fill={ink.white} stroke={ink.outline} strokeWidth="1.8" />
        <path d="M4 27 L10 27 L13 19 L17 34 L21 23 L24 27 L32 27" stroke={ink.heart} strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <rect x="6" y="6" width="24" height="6" rx="3" fill={ink.iv} />
      </g>
      <path d="M176 72 L176 106" stroke={ink.outline} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
