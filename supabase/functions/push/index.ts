// Sends queued Web Push notifications and cleans up old water photos.
// Called by the database (pg_net) with the shared cron secret; see 20261019040000_push_rules.sql.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'
import zhHant from './locales/zh-Hant.json' with { type: 'json' }
import enGB from './locales/en-GB.json' with { type: 'json' }

type Role = 'yoyo' | 'kyle'
type Locale = { terms: Record<string, string>; messages: Record<string, [string, string]> }
const locales: Record<string, Locale> = { 'zh-Hant': zhHant as Locale, 'en-GB': enGB as Locale }

const PHOTO_RETENTION_DAYS = 14 // mirrors water.photoRetentionDays in src/config/rules.ts

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'https://ylc71618.github.io/yk-station/',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

function render(lang: string, kind: string, params: Record<string, unknown>) {
  const loc = locales[lang] ?? locales['zh-Hant']
  const [title, body] = loc.messages[kind] ?? [kind, '']
  const fill = (s: string) =>
    s.replace(/\{(\w+)\}/g, (m, k: string) => {
      const v = params[k]
      if (v === undefined || v === null) return m
      return loc.terms[String(v)] ?? String(v)
    })
  return { title: fill(title), body: fill(body) }
}

/** Items waiting for this person: reviews to do + an open water request. Shown as the app badge. */
async function badgeFor(role: Role) {
  const other = role === 'yoyo' ? 'kyle' : 'yoyo'
  const { count: reviews } = await db.from('water_logs').select('id', { count: 'exact', head: true }).eq('role', other).eq('status', 'pending')
  let open = 0
  if (role === 'yoyo') {
    const { count } = await db.from('water_requests').select('id', { count: 'exact', head: true }).is('resolved_at', null)
    open = count ? 1 : 0
  }
  return (reviews ?? 0) + open
}

async function sendQueued() {
  const { data: queue } = await db.from('push_queue').select('*').is('sent_at', null).order('id').limit(50)
  if (!queue?.length) return 0

  const { data: profiles } = await db.from('profiles').select('id, role, lang')
  const byRole = new Map((profiles ?? []).map((p) => [p.role as Role, p]))
  const { data: subs } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth')

  for (const item of queue) {
    const profile = byRole.get(item.to_role)
    let error: string | null = null
    if (profile) {
      const { title, body } = render(profile.lang, item.kind, item.params ?? {})
      const payload = JSON.stringify({ title, body, url: item.url, tag: item.kind, badge: await badgeFor(item.to_role) })
      for (const s of (subs ?? []).filter((x) => x.user_id === profile.id)) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 })
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode
          // Subscription gone (app removed / permission revoked): forget it.
          if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
          else error = String((e as Error).message ?? e)
        }
      }
    }
    await db.from('push_queue').update({ sent_at: new Date().toISOString(), error }).eq('id', item.id)
  }
  return queue.length
}

/** Delete photos 14 days after review (once a day). */
async function cleanPhotos() {
  const today = new Date().toISOString().slice(0, 10)
  const { error: claimed } = await db.from('rule_runs').insert({ job: 'photo_cleanup', day: today })
  if (claimed) return 0
  const cutoff = new Date(Date.now() - PHOTO_RETENTION_DAYS * 86_400_000).toISOString()
  const { data: logs } = await db
    .from('water_logs')
    .select('id, full_path, empty_path')
    .neq('status', 'pending')
    .lt('reviewed_at', cutoff)
    .not('full_path', 'is', null)
  if (!logs?.length) return 0
  await db.storage.from('water-photos').remove(logs.flatMap((l) => [l.full_path, l.empty_path].filter(Boolean)))
  await db.from('water_logs').update({ full_path: null, empty_path: null }).in('id', logs.map((l) => l.id))
  return logs.length
}

Deno.serve(async (req) => {
  const secret = req.headers.get('x-cron-secret') ?? ''
  const { data: ok } = await db.rpc('check_cron_secret', { p_secret: secret })
  if (!ok) return new Response('forbidden', { status: 403 })

  const sent = await sendQueued()
  const cleaned = await cleanPhotos()
  return Response.json({ sent, cleaned })
})
