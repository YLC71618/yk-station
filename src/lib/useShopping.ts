import { useCallback, useEffect, useState } from 'react'
import { supabase, type Role } from './supabase'

export type Item = { id: string; name: string; added_by: Role; done: boolean; created_at: string }

let seq = 0

/** The shared shopping list, synced live between the two phones. */
export function useShopping() {
  const [items, setItems] = useState<Item[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase!.from('shopping_items').select('id, name, added_by, done, created_at').order('created_at')
    if (data) setItems(data as Item[])
  }, [])

  useEffect(() => {
    load()
    const ch = supabase!
      .channel(`shopping-${++seq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, load)
      .subscribe()
    return () => {
      supabase!.removeChannel(ch)
    }
  }, [load])

  const add = useCallback(
    async (name: string, by: Role) => {
      await supabase!.from('shopping_items').insert({ name, added_by: by })
      await load()
    },
    [load],
  )

  const tick = useCallback(async (item: Item, done: boolean) => {
    setItems((all) => all.map((x) => (x.id === item.id ? { ...x, done } : x)))
    const { error } = await supabase!.rpc('tick_item', { p_id: item.id, p_done: done })
    if (error) throw error
  }, [])

  const clearDone = useCallback(async () => {
    await supabase!.from('shopping_items').delete().eq('done', true)
    await load()
  }, [load])

  return { items, add, tick, clearDone }
}
