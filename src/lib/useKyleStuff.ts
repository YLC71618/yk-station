import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { londonDay } from './time'

export type ChoreKind = 'shave' | 'nails'
export type Chore = { id: string; kind: ChoreKind; interval_days: number; last_done_at: string }
export type HandScore = { id: string; delta: 1 | -1; created_at: string }

const DAY_MS = 86_400_000

/** Days until due on the London calendar; negative = overdue. Mirrors chore_days_left() in SQL. */
export function daysLeft(c: Chore) {
  const last = Date.parse(londonDay(c.last_done_at))
  const today = Date.parse(londonDay())
  return Math.round((last + c.interval_days * DAY_MS - today) / DAY_MS)
}

let seq = 0

export function useChores() {
  const [chores, setChores] = useState<Chore[]>([])
  const load = useCallback(async () => {
    const { data } = await supabase!.from('chores').select('id, kind, interval_days, last_done_at').order('interval_days')
    if (data) setChores(data as Chore[])
  }, [])

  useEffect(() => {
    load()
    const ch = supabase!
      .channel(`chores-${++seq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, load)
      .subscribe()
    return () => {
      supabase!.removeChannel(ch)
    }
  }, [load])

  const complete = useCallback(
    async (kind: ChoreKind) => {
      const { data, error } = await supabase!.rpc('complete_chore', { p_kind: kind })
      if (error) throw error
      await load()
      return data as { ok: boolean; on_time?: boolean; earned?: number; error?: string }
    },
    [load],
  )

  return { chores, complete }
}

export function useHands() {
  const [scores, setScores] = useState<HandScore[]>([])
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    const { data } = await supabase!.from('hand_scores').select('id, delta, created_at').order('created_at', { ascending: false })
    if (!data) return
    const rows = data as HandScore[]
    setScores(rows.slice(0, 5))
    setTotal(rows.reduce((s, r) => s + r.delta, 0))
  }, [])

  useEffect(() => {
    load()
    const ch = supabase!
      .channel(`hands-${++seq}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hand_scores' }, load)
      .subscribe()
    return () => {
      supabase!.removeChannel(ch)
    }
  }, [load])

  const score = useCallback(
    async (delta: 1 | -1) => {
      const { data, error } = await supabase!.rpc('score_hand', { p_delta: delta })
      if (error) throw error
      await load()
      return data as { ok: boolean; clean?: number; error?: string }
    },
    [load],
  )

  return { scores, total, score }
}
