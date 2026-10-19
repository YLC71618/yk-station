import { useCallback, useEffect, useState } from 'react'
import { supabase, type Role } from './supabase'

export type Balances = Record<Role, number>

let channelSeq = 0

/** Both coin balances from the coin_balances view, refreshed on every ledger insert. */
export function useBalances() {
  const [balances, setBalances] = useState<Balances>({ yoyo: 0, kyle: 0 })

  const load = useCallback(async () => {
    const { data } = await supabase!.from('coin_balances').select('role, balance')
    if (!data) return
    const next: Balances = { yoyo: 0, kyle: 0 }
    for (const row of data as { role: Role; balance: number }[]) next[row.role] = row.balance
    setBalances(next)
  }, [])

  useEffect(() => {
    load()
    const channel = supabase!
      .channel(`balances-${++channelSeq}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coin_ledger' }, load)
      .subscribe()
    return () => {
      supabase!.removeChannel(channel)
    }
  }, [load])

  return balances
}
