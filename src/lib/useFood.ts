import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, type Role } from './supabase'

export type Wish = { id: string; name: string; who: Role; source_index: number; created_at: string }
export type WheelOption = { id: string; name: string }

let seq = 0

/** Wish lists (not yet cooked) + spinner options, live on both phones. */
export function useFood() {
  const [wishes, setWishes] = useState<Wish[]>([])
  const [options, setOptions] = useState<WheelOption[]>([])

  const load = useCallback(async () => {
    const db = supabase!
    const [w, o] = await Promise.all([
      db.from('food_wishes').select('id, name, who, source_index, created_at').is('cooked_at', null).order('created_at'),
      db.from('wheel_options').select('id, name').order('name'),
    ])
    if (w.data) setWishes(w.data as Wish[])
    if (o.data) setOptions(o.data as WheelOption[])
  }, [])

  useEffect(() => {
    load()
    const ch = supabase!
      .channel(`food-${++seq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_wishes' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wheel_options' }, load)
      .subscribe()
    return () => {
      supabase!.removeChannel(ch)
    }
  }, [load])

  /** Spinner = options + wish-list dishes, de-duplicated (SPEC §6.4). */
  const spinnerNames = useMemo(() => [...new Set([...options.map((o) => o.name), ...wishes.map((w) => w.name)])], [options, wishes])

  const addWish = useCallback(
    async (name: string, who: Role) => {
      await supabase!.from('food_wishes').insert({ name, who })
      await load()
    },
    [load],
  )

  const removeWish = useCallback(
    async (id: string) => {
      await supabase!.from('food_wishes').delete().eq('id', id)
      await load()
    },
    [load],
  )

  const nextSource = useCallback(
    async (w: Wish) => {
      setWishes((all) => all.map((x) => (x.id === w.id ? { ...x, source_index: x.source_index + 1 } : x)))
      await supabase!.from('food_wishes').update({ source_index: w.source_index + 1 }).eq('id', w.id)
    },
    [],
  )

  const cook = useCallback(
    async (id: string) => {
      const { data, error } = await supabase!.rpc('cook_wish', { p_id: id })
      if (error) throw error
      await load()
      return data as { ok: boolean; coins?: number; error?: string }
    },
    [load],
  )

  const addOption = useCallback(
    async (name: string) => {
      const { error } = await supabase!.from('wheel_options').insert({ name })
      await load()
      return !error
    },
    [load],
  )

  const removeOption = useCallback(
    async (id: string) => {
      await supabase!.from('wheel_options').delete().eq('id', id)
      await load()
    },
    [load],
  )

  return { wishes, options, spinnerNames, addWish, removeWish, nextSource, cook, addOption, removeOption }
}
