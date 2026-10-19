import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type DayResult = { day: string; yoyo_cups: number; yoyo_ok: boolean; kyle_ok: boolean }

const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

/** Finished days of one month (written by the day_end job just after London midnight). */
export function useMonthResults(year: number, month: number) {
  const [results, setResults] = useState<Record<string, DayResult>>({})

  useEffect(() => {
    let cancelled = false
    const last = new Date(year, month + 1, 0).getDate()
    supabase!
      .from('daily_results')
      .select('day, yoyo_cups, yoyo_ok, kyle_ok')
      .gte('day', ymd(year, month, 1))
      .lte('day', ymd(year, month, last))
      .then(({ data }) => {
        if (cancelled || !data) return
        const map: Record<string, DayResult> = {}
        for (const r of data as DayResult[]) map[r.day] = r
        setResults(map)
      })
    return () => {
      cancelled = true
    }
  }, [year, month])

  return results
}
