import { useCallback, useEffect, useState } from 'react'
import { supabase, type Role } from './supabase'
import { useBalances } from './useBalances'
import type { Severity, TreatmentKind } from '../config/rules'

export type Illness = 'dehydration' | 'cracked_paws' | 'rash' | 'ingrown_claw' | 'blues' | 'exhausted'
/** Who pays: one person, or 'both' (half each) for illnesses from the shared stats. */
export type Payer = Role | 'both'

export type Bear = {
  water: number
  clean: number
  mood: number
  energy: number
  illness: Illness | null
  severity: Severity | null
  caused_by: Payer | null
  ill_since: string | null
  hospital_until: string | null
  admitted_at: string
}

export type TreatResult =
  | { ok: true; waiting: boolean; shared: boolean }
  | { ok: false; error: 'healthy' | 'waiting_bed' | 'not_payer' | 'not_curable' | 'bad_kind' }
  | { ok: false; error: 'insufficient'; missing: number; partner_missing?: number }

/** Bear row + both coin balances, kept live with Supabase Realtime. */
export function useWard() {
  const [bear, setBear] = useState<Bear | null>(null)
  const balances = useBalances()

  const load = useCallback(async () => {
    const { data } = await supabase!.from('bear').select('*').eq('id', 1).single()
    if (data) setBear(data as Bear)
  }, [])

  useEffect(() => {
    const db = supabase!
    // Finish a hospital stay whose bed wait is over, then read.
    db.rpc('settle_bear').then(load)
    const channel = db
      .channel('ward')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bear' }, load)
      .subscribe()
    return () => {
      db.removeChannel(channel)
    }
  }, [load])

  // While waiting for a bed, check again when the wait should be over.
  useEffect(() => {
    if (!bear?.hospital_until) return
    const ms = new Date(bear.hospital_until).getTime() - Date.now()
    const id = window.setTimeout(() => supabase!.rpc('settle_bear').then(load), Math.max(ms, 0) + 1000)
    return () => window.clearTimeout(id)
  }, [bear?.hospital_until, load])

  const treat = useCallback(
    async (kind: TreatmentKind): Promise<TreatResult> => {
      const { data, error } = await supabase!.rpc('treat_bear', { p_kind: kind })
      if (error) throw error
      await load()
      return data as TreatResult
    },
    [load],
  )

  const nudge = useCallback(async () => {
    await supabase!.rpc('nudge_payer')
  }, [])

  return { bear, balances, treat, nudge }
}
