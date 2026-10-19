import { supabase } from './supabase'

export type PushStatus = 'unsupported' | 'install' | 'denied' | 'off' | 'on'

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function registration() {
  if (!('serviceWorker' in navigator)) return undefined
  return navigator.serviceWorker.getRegistration()
}

/** iOS only offers Web Push to Home Screen apps, so outside one the answer is "install first". */
export async function pushStatus(): Promise<PushStatus> {
  if (!supported()) return isIOS() && !isStandalone() ? 'install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await registration()
  if (!reg) return 'unsupported'
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off'
}

function base64UrlToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON()
  await supabase!
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth }, { onConflict: 'endpoint' })
}

/** Must run from a user tap (iOS requirement). */
export async function enablePush(): Promise<PushStatus> {
  if (!supported()) return pushStatus()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const reg = await registration()
  if (!reg) return 'unsupported'
  const { data } = await supabase!.from('app_config').select('value').eq('key', 'vapid_public').single()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(data!.value) }))
  await save(sub)
  return 'on'
}

/** On app start, make sure the server still has this phone's subscription. */
export async function syncPush() {
  if (!supported() || Notification.permission !== 'granted') return
  const sub = await (await registration())?.pushManager.getSubscription()
  if (sub) await save(sub)
}

export async function sendTestPush() {
  await supabase!.rpc('test_push')
}

/** App icon badge (iOS 16.4+ Home Screen apps; ignored elsewhere). */
export function setBadge(n: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  ;(n > 0 ? nav.setAppBadge?.(n) : nav.clearAppBadge?.())?.catch(() => undefined)
}
