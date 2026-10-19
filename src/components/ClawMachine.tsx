import { useEffect, useMemo, useRef, useState } from 'react'
import { CLAW_MAX_ITEMS } from '../config/recipes'
import { useI18n } from '../i18n'
import './ClawMachine.css'

type Phase = 'idle' | 'move' | 'drop' | 'grip' | 'lift' | 'done'

const MOVE_MS = 900
const DROP_MS = 700
const GRIP_MS = 350
const LIFT_MS = 800
const CLAW_W = 44
const RAIL_Y = 6

/** Stable pseudo-random numbers from a dish name, so each plush keeps its tilt between renders. */
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

const TONES = ['a', 'b', 'c', 'd'] as const
const toneOf = (name: string) => TONES[Math.floor(hash(name + '#') * TONES.length) % TONES.length]

/** Claw machine state: the plush pile and one grab at a time. */
export function useClaw(names: string[]) {
  // Too many dishes → a random subset fits in the machine.
  const items = useMemo(() => {
    if (names.length <= CLAW_MAX_ITEMS) return names
    return [...names].sort(() => Math.random() - 0.5).slice(0, CLAW_MAX_ITEMS)
  }, [names])

  const [phase, setPhase] = useState<Phase>('idle')
  // The grabbed dish by name: the pile can change underneath (new dish added) without swapping the prize.
  const [target, setTarget] = useState<string | null>(null)
  const [clawX, setClawX] = useState<number | null>(null)
  const [rope, setRope] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLSpanElement | null)[]>([])
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const busy = phase !== 'idle' && phase !== 'done'
  const result = phase === 'done' && target !== null ? target : ''

  function later(ms: number, fn: () => void) {
    timers.current.push(window.setTimeout(fn, ms))
  }

  function grab() {
    if (busy || !items.length || !boxRef.current) return
    const i = Math.floor(Math.random() * items.length)
    const chip = chipRefs.current[i]
    if (!chip) return
    const box = boxRef.current.getBoundingClientRect()
    const r = chip.getBoundingClientRect()
    const x = r.left - box.left + r.width / 2 - CLAW_W / 2
    const drop = Math.max(0, r.top - box.top - RAIL_Y - 30)

    setTarget(items[i])
    setRope(0)
    setPhase('move')
    setClawX(x)
    later(MOVE_MS, () => {
      setPhase('drop')
      setRope(drop)
    })
    later(MOVE_MS + DROP_MS, () => setPhase('grip'))
    later(MOVE_MS + DROP_MS + GRIP_MS, () => {
      setPhase('lift')
      setRope(0)
    })
    later(MOVE_MS + DROP_MS + GRIP_MS + LIFT_MS, () => setPhase('done'))
  }

  return { items, phase, target, clawX, rope, busy, result, grab, boxRef, chipRefs }
}

export function ClawBox({ claw }: { claw: ReturnType<typeof useClaw> }) {
  const { t } = useI18n()
  const { items, phase, target, clawX, rope, boxRef, chipRefs } = claw
  const carrying = (phase === 'lift' || phase === 'done') && target !== null
  const closed = phase === 'grip' || carrying

  return (
    <div className="claw">
      <div className="claw__sign">{t('claw.sign')}</div>
      <div className="claw__glass" ref={boxRef} aria-hidden="true">
        <div className="claw__rail" />
        <div
          className={`claw__arm${clawX === null ? ' claw__arm--home' : ''}`}
          style={{ left: clawX ?? undefined, transitionDuration: `${MOVE_MS}ms` }}
        >
          <div
            className="claw__rope"
            style={{ height: 12 + rope, transitionDuration: `${phase === 'lift' ? LIFT_MS : DROP_MS}ms` }}
          />
          <svg className={`claw__head${closed ? ' is-closed' : ''}`} width={CLAW_W} height="34" viewBox="0 0 44 34">
            <rect x="12" y="0" width="20" height="10" rx="4" />
            <g className="claw__prong claw__prong--l">
              <path d="M16 9 C8 14 6 22 12 30" />
            </g>
            <g className="claw__prong claw__prong--r">
              <path d="M28 9 C36 14 38 22 32 30" />
            </g>
          </svg>
          {carrying && <span className={`claw__prize claw__chip--${toneOf(target!)}`}>{target}</span>}
        </div>

        <div className="claw__pile">
          {items.map((name, i) => {
            const h = hash(name)
            const tilt = Math.round((h * 2 - 1) * 16)
            const lift = Math.round((hash(name + '!') * 2 - 1) * 3)
            return (
              <span
                key={name}
                ref={(el) => {
                  chipRefs.current[i] = el
                }}
                className={`claw__chip claw__chip--${toneOf(name)}${carrying && name === target ? ' is-taken' : ''}`}
                style={{ transform: `rotate(${tilt}deg) translateY(${lift}px)` }}
              >
                {name}
              </span>
            )
          })}
          {!items.length && <span className="claw__empty">{t('claw.empty')}</span>}
        </div>
      </div>
    </div>
  )
}
