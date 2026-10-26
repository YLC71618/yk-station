import { useMemo, useState } from 'react'
import PageHeader from '../shell/PageHeader'
import { ChevronIcon } from '../components/icons'
import { useI18n } from '../i18n'
import { londonDay } from '../lib/time'
import { useMonthResults, ymd, type DayResult } from '../lib/useCalendar'
import { useWaterContext } from '../water/WaterProvider'
import { daysLeft, useChores, useHands } from '../lib/useKyleStuff'
import { water } from '../config/rules'
import './CalendarPage.css'

type Status = { yoyo: boolean; kyle: boolean; cups: number; live: boolean; waterPaused: boolean } | null

export default function CalendarPage() {
  const { t, lang } = useI18n()
  const today = londonDay()
  const [ty, tm] = today.split('-').map(Number)
  const [year, setYear] = useState(ty)
  const [month, setMonth] = useState(tm - 1)
  const [picked, setPicked] = useState(today)
  const results = useMonthResults(year, month)

  // Today isn't finished yet, so it's worked out live from the same rules.
  const { count, paused } = useWaterContext()
  const { chores } = useChores()
  const { scores } = useHands()
  const todayLive: Status = {
    cups: count('yoyo').approved,
    yoyo: count('yoyo').approved >= water.dailyGoalYoyo,
    kyle: chores.every((c) => daysLeft(c) >= 0) && !scores.some((s) => s.delta < 0 && londonDay(s.created_at) === today),
    live: true,
    waterPaused: paused,
  }

  const statusOf = (day: string): Status => {
    if (day === today) return todayLive
    const r: DayResult | undefined = results[day]
    return r ? { yoyo: r.yoyo_ok, kyle: r.kyle_ok, cups: r.yoyo_cups, live: false, waterPaused: r.water_paused } : null
  }

  // Week starts on Sunday in Taiwan, Monday in the UK.
  const weekStart = lang === 'en-GB' ? 1 : 0
  const cells = useMemo(() => {
    const first = new Date(year, month, 1).getDay()
    const lead = (first - weekStart + 7) % 7
    const total = new Date(year, month + 1, 0).getDate()
    return [...Array<null>(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
  }, [year, month, weekStart])

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang, { weekday: 'narrow' })
    // 2023-01-01 was a Sunday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + ((i + weekStart) % 7))))
  }, [lang, weekStart])

  const title = new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long' }).format(new Date(year, month, 1))

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const sel = statusOf(picked)
  const isFutureMonth = year > ty || (year === ty && month >= tm - 1)

  return (
    <>
      <PageHeader kicker="YK STATION" title={t('calendar.title')} />
      <div className="page-body">
        <section className="card cal">
          <div className="cal__head">
            <button type="button" className="cal__nav" onClick={() => shift(-1)} aria-label={t('calendar.prev')}>
              <ChevronIcon dir="left" />
            </button>
            <h2 className="cal__month">{title}</h2>
            <button type="button" className="cal__nav" onClick={() => shift(1)} disabled={isFutureMonth} aria-label={t('calendar.next')}>
              <ChevronIcon />
            </button>
          </div>

          <div className="cal__grid" role="grid">
            {weekdays.map((w, i) => (
              <span key={`w${i}`} className="cal__weekday">
                {w}
              </span>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <span key={`e${i}`} />
              const day = ymd(year, month, d)
              const s = statusOf(day)
              return (
                <button
                  key={day}
                  type="button"
                  className={`cal__day${day === today ? ' is-today' : ''}${day === picked ? ' is-picked' : ''}${day > today ? ' is-future' : ''}`}
                  onClick={() => setPicked(day)}
                  disabled={day > today}
                >
                  <span className="cal__num">{d}</span>
                  {s && (
                    <span className="cal__dots">
                      <span className={`cal__dot cal__dot--yoyo${s.waterPaused ? ' is-paused' : s.yoyo ? ' is-ok' : ''}`} />
                      <span className={`cal__dot cal__dot--kyle${s.kyle ? ' is-ok' : ''}`} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="cal__legend">
            <span>
              <span className="cal__dot cal__dot--yoyo is-ok" /> {t('calendar.legendYoyo', { n: water.dailyGoalYoyo })}
            </span>
            <span>
              <span className="cal__dot cal__dot--kyle is-ok" /> {t('calendar.legendKyle')}
            </span>
          </div>
        </section>

        <section className="card card--soft cal-detail">
          <h2 className="settings__heading">
            {new Intl.DateTimeFormat(lang, { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(picked + 'T12:00:00'))}
            {sel?.live && <span className="cal-detail__live">{t('calendar.live')}</span>}
          </h2>
          {sel ? (
            <ul className="cal-detail__list">
              <li>
                <span className="cal__dot cal__dot--yoyo is-ok" />
                <span>{t('calendar.yoyoLine', { cups: sel.cups, goal: water.dailyGoalYoyo })}</span>
                {sel.waterPaused ? (
                  <strong className="paused">{t('calendar.paused')}</strong>
                ) : (
                  <strong className={sel.yoyo ? 'ok' : 'miss'}>{t(sel.yoyo ? 'calendar.done' : 'calendar.missed')}</strong>
                )}
              </li>
              <li>
                <span className="cal__dot cal__dot--kyle is-ok" />
                <span>{t('calendar.kyleLine')}</span>
                <strong className={sel.kyle ? 'ok' : 'miss'}>{t(sel.kyle ? 'calendar.done' : 'calendar.missed')}</strong>
              </li>
            </ul>
          ) : (
            <p className="muted-small">{t('calendar.noData')}</p>
          )}
        </section>
      </div>
    </>
  )
}
