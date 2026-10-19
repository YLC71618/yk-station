import { useEffect, useMemo, useRef, useState } from 'react'
import { SPINNER_MAX_SLICES } from '../config/recipes'
import './Spinner.css'

const SPIN_MS = 3000
const COLOURS = ['var(--slice-a)', 'var(--slice-b)', 'var(--slice-c)']

/** Wheel from design/Food.dc.html. Calls onResult with the picked name when it stops. */
export function useSpinner(names: string[]) {
  // Too many dishes → spin a stable random subset so labels stay readable.
  const slices = useMemo(() => {
    if (names.length <= SPINNER_MAX_SLICES) return names
    return [...names].sort(() => Math.random() - 0.5).slice(0, SPINNER_MAX_SLICES)
  }, [names])
  const [rot, setRot] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState('')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function spin() {
    if (spinning || !slices.length) return
    const n = slices.length
    const a = 360 / n
    const i = Math.floor(Math.random() * n)
    // Bring the middle of slice i under the pointer at the top.
    const target = (360 - (i * a + a / 2)) % 360
    setRot((cur) => cur - (cur % 360) + 5 * 360 + target)
    setSpinning(true)
    setResult('')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setSpinning(false)
      setResult(slices[i])
    }, SPIN_MS + 100)
  }

  return { slices, rot, spinning, result, spin }
}

export function Wheel({ slices, rot }: { slices: string[]; rot: number }) {
  const n = Math.max(slices.length, 1)
  const a = 360 / n
  const colour = (i: number) => {
    const c = COLOURS[i % 2]
    // Avoid the last slice matching the first one on odd counts.
    return n % 2 === 1 && i === n - 1 && n > 1 ? COLOURS[2] : c
  }
  const gradient = slices.length
    ? `conic-gradient(${slices.map((_, i) => `${colour(i)} ${i * a}deg ${(i + 1) * a}deg`).join(', ')})`
    : 'var(--slice-c)'

  return (
    <div className="wheel" aria-hidden="true">
      <svg className="wheel__pointer" width="22" height="20" viewBox="0 0 28 26">
        <path d="M14 24 L3 4 Q2 1 6 1 L22 1 Q26 1 25 4 Z" />
      </svg>
      <div className="wheel__disc">
        <div className="wheel__face" style={{ background: gradient, transform: `rotate(${rot}deg)`, transitionDuration: `${SPIN_MS}ms` }}>
          {slices.map((name, i) => (
            <span key={name} className="wheel__label" style={{ transform: `rotate(${i * a + a / 2}deg) translateY(-48px)` }}>
              {name}
            </span>
          ))}
        </div>
        <div className="wheel__hub" />
      </div>
    </div>
  )
}
