import { TIME_ZONE } from '../config/rules'

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

/** YYYY-MM-DD of the London calendar day — every daily rule uses this day. */
export function londonDay(d: Date | string = new Date()) {
  return dayFmt.format(typeof d === 'string' ? new Date(d) : d)
}

export function isToday(d: Date | string) {
  return londonDay(d) === londonDay()
}

export function hhmm(d: Date | string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Stamp burned into water photos so old ones can't be reused. */
export function photoStamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
