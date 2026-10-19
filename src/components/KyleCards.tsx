import { useState } from 'react'
import { useI18n } from '../i18n'
import { coins } from '../config/rules'
import { hhmm, isToday, londonDay } from '../lib/time'
import { daysLeft, useChores, useHands, type Chore } from '../lib/useKyleStuff'
import type { Role } from '../lib/supabase'
import './KyleCards.css'

/** Shave / nails countdown rings. Only Kyle can tick them off. */
export function ChoreCards({ me, onResult }: { me: Role; onResult: (msg: string) => void }) {
  const { t } = useI18n()
  const { chores, complete } = useChores()
  const [busy, setBusy] = useState<string | null>(null)

  async function done(c: Chore) {
    setBusy(c.kind)
    try {
      const res = await complete(c.kind)
      const label = t(`chore.${c.kind}`)
      onResult(
        res.on_time
          ? t('chore.doneOnTime', { what: label, coins: res.earned ?? 0, days: c.interval_days })
          : t('chore.doneLate', { what: label, days: c.interval_days }),
      )
    } catch {
      onResult(t('auth.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="chores">
      {chores.map((c) => {
        const left = daysLeft(c)
        const pct = Math.max(0, Math.min(100, Math.round((left / c.interval_days) * 100)))
        const urgent = left <= 1
        return (
          <section key={c.kind} className="card chore">
            <h2 className="chore__title">{t(`chore.${c.kind}`)}</h2>
            <div
              className={`chore__ring${urgent ? ' chore__ring--urgent' : ''}`}
              style={{ ['--pct' as string]: `${pct}%` }}
              role="img"
              aria-label={left >= 0 ? t('chore.daysLeft', { n: left }) : t('chore.overdue', { n: -left })}
            >
              <span className="chore__num">{Math.abs(left)}</span>
              <span className="chore__unit">{left >= 0 ? t('chore.daysUntil') : t('chore.daysLate')}</span>
            </div>
            <span className="chore__every">{t('chore.every', { n: c.interval_days })}</span>
            {me === 'kyle' && (
              <button type="button" className="chore__done" disabled={busy === c.kind || left > 0} onClick={() => done(c)}>
                {left > 0
                  ? t('chore.notYet', { n: left })
                  : left === 0
                    ? t('chore.doneButton', { coins: coins.choreOnTime })
                    : t('chore.doneButtonLate')}
              </button>
            )}
          </section>
        )
      })}
    </div>
  )
}

/** Hand-drying score. Yoyo scores it on her tab; everywhere else it is read-only. */
export function HandScoreCard({ me, scoring, onResult }: { me: Role; scoring: boolean; onResult: (msg: string) => void }) {
  const { t } = useI18n()
  const { scores, total, score } = useHands()
  const [busy, setBusy] = useState(false)
  const canScore = scoring && me === 'yoyo'
  const title = canScore ? 'hand.titleYoyo' : me === 'kyle' ? 'hand.titleKyle' : 'hand.titleRead'

  async function rate(delta: 1 | -1) {
    setBusy(true)
    try {
      await score(delta)
      onResult(t(delta > 0 ? 'hand.toastPlus' : 'hand.toastMinus'))
    } catch {
      onResult(t('auth.error.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card hand">
      <div className="hand__top">
        <div className="hand__titles">
          <h2 className="section-title">{t(title)}</h2>
          {title !== 'hand.titleRead' && <span className="muted-small">{t(canScore ? 'hand.hintYoyo' : 'hand.hintKyle')}</span>}
        </div>
        <span className="hand__total">{total}</span>
      </div>
      {canScore && (
        <div className="hand__buttons">
          <button type="button" className="hand__plus" disabled={busy} onClick={() => rate(1)}>
            {t('hand.plus')}
          </button>
          <button type="button" className="hand__minus" disabled={busy} onClick={() => rate(-1)}>
            {t('hand.minus')}
          </button>
        </div>
      )}
      <ul className="hand__log">
        {scores.map((s) => (
          <li key={s.id}>
            <span>{t(isToday(s.created_at) ? 'time.today' : dayLabel(s.created_at), { time: hhmm(s.created_at) })}</span>
            <strong className={s.delta > 0 ? 'hand__good' : 'hand__bad'}>{t(s.delta > 0 ? 'hand.plus' : 'hand.minus')}</strong>
          </li>
        ))}
        {!scores.length && <li className="hand__empty">{t('hand.empty')}</li>}
      </ul>
    </section>
  )
}

function dayLabel(iso: string) {
  const yesterday = londonDay(new Date(Date.now() - 86_400_000))
  return londonDay(iso) === yesterday ? 'time.yesterday' : 'time.earlier'
}
