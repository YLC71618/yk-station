import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, type Role } from './supabase'
import { isToday } from './time'

export type WaterLog = {
  id: string
  role: Role
  status: 'pending' | 'approved' | 'rejected'
  full_path: string
  empty_path: string
  created_at: string
}

export type WaterRequest = {
  id: string
  created_at: string
  snoozed_until: string | null
  snoozes: number
}

let channelSeq = 0

/** Today's water logs for both people, the open request and snoozes left — live. */
export function useWater() {
  const [logs, setLogs] = useState<WaterLog[]>([])
  const [request, setRequest] = useState<WaterRequest | null>(null)
  const [snoozesLeft, setSnoozesLeft] = useState(0)
  /** Water feature switched off from Settings (no cards, no notifications, no penalties). */
  const [paused, setPausedState] = useState(false)

  const load = useCallback(async () => {
    const db = supabase!
    // 36h window covers "today" in London from any time zone (filtered precisely below),
    // plus anything still waiting for review however old.
    const since = new Date(Date.now() - 36 * 3600_000).toISOString()
    const [l, r, s, p] = await Promise.all([
      db
        .from('water_logs')
        .select('id, role, status, full_path, empty_path, created_at')
        .or(`created_at.gte.${since},status.eq.pending`)
        .order('created_at'),
      db.from('water_requests').select('id, created_at, snoozed_until, snoozes').is('resolved_at', null).order('created_at', { ascending: false }).limit(1),
      db.rpc('snoozes_left'),
      db.from('app_config').select('value').eq('key', 'water_paused').maybeSingle(),
    ])
    if (l.data) setLogs(l.data as WaterLog[])
    setRequest((r.data?.[0] as WaterRequest) ?? null)
    if (typeof s.data === 'number') setSnoozesLeft(s.data)
    setPausedState(p.data?.value === 'true')
  }, [])

  useEffect(() => {
    load()
    const channel = supabase!
      .channel(`water-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_logs' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_requests' }, load)
      .subscribe()
    return () => {
      supabase!.removeChannel(channel)
    }
  }, [load])

  const today = useMemo(() => logs.filter((l) => isToday(l.created_at)), [logs])

  const count = useCallback(
    (role: Role) => ({
      approved: today.filter((l) => l.role === role && l.status === 'approved').length,
      pending: today.filter((l) => l.role === role && l.status === 'pending').length,
    }),
    [today],
  )

  /** Everything still waiting for review (any day), oldest first. */
  const pendingFor = useCallback((owner: Role) => logs.filter((l) => l.role === owner && l.status === 'pending'), [logs])

  const submit = useCallback(
    async (role: Role, full: Blob, empty: Blob) => {
      const db = supabase!
      const id = crypto.randomUUID()
      const fullPath = `${role}/${id}/full.jpg`
      const emptyPath = `${role}/${id}/empty.jpg`
      const bucket = db.storage.from('water-photos')
      const up = await Promise.all([
        bucket.upload(fullPath, full, { contentType: 'image/jpeg' }),
        bucket.upload(emptyPath, empty, { contentType: 'image/jpeg' }),
      ])
      if (up.some((u) => u.error)) throw up.find((u) => u.error)!.error
      const { error } = await db.from('water_logs').insert({ id, full_path: fullPath, empty_path: emptyPath })
      if (error) throw error
      await load()
    },
    [load],
  )

  const review = useCallback(
    async (id: string, approve: boolean) => {
      const { data, error } = await supabase!.rpc('review_water', { p_log: id, p_approve: approve })
      if (error) throw error
      await load()
      return data as { ok: boolean; error?: string }
    },
    [load],
  )

  const requestWater = useCallback(async () => {
    const { data, error } = await supabase!.rpc('request_water')
    if (error) throw error
    await load()
    return data as { ok: boolean; existing?: boolean; error?: string }
  }, [load])

  const snooze = useCallback(async () => {
    const { data, error } = await supabase!.rpc('snooze_water')
    if (error) throw error
    await load()
    return data as { ok: boolean; left?: number; error?: string }
  }, [load])

  /** Yoyo, goal already met: decline this request (no snooze used). */
  const decline = useCallback(async () => {
    const { data, error } = await supabase!.rpc('decline_water')
    if (error) throw error
    await load()
    return data as { ok: boolean; error?: string }
  }, [load])

  const setPaused = useCallback(
    async (value: boolean) => {
      const { error } = await supabase!.rpc('set_water_paused', { p_paused: value })
      if (error) throw error
      await load()
    },
    [load],
  )

  return { today, request, snoozesLeft, paused, setPaused, count, pendingFor, submit, review, requestWater, snooze, decline }
}

/** Signed URLs for private photos (1 hour). */
export async function signedPhotoUrls(paths: string[]) {
  if (!paths.length) return {} as Record<string, string>
  const { data } = await supabase!.storage.from('water-photos').createSignedUrls(paths, 3600)
  const map: Record<string, string> = {}
  for (const d of data ?? []) if (d.path && d.signedUrl) map[d.path] = d.signedUrl
  return map
}
