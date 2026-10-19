/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa injectManifest): offline precache + Web Push.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
// SPA: every navigation gets the cached index.html.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

type PushPayload = { title?: string; body?: string; url?: string; tag?: string; badge?: number }

self.addEventListener('push', (event) => {
  const data: PushPayload = event.data?.json() ?? {}
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title ?? '又鍇站', {
        body: data.body,
        icon: 'pwa-192x192.png',
        badge: 'pwa-64x64.png',
        tag: data.tag,
        data: { url: data.url ?? '/' },
      })
      // App icon badge = things waiting for this person (iOS 16.4+ Home Screen apps).
      const nav = self.navigator as WorkerNavigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
      if (typeof data.badge === 'number') {
        await (data.badge > 0 ? nav.setAppBadge?.(data.badge) : nav.clearAppBadge?.())
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = (event.notification.data?.url as string) ?? '/'
  const target = new URL(path.replace(/^\//, ''), self.registration.scope).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const w of windows) {
        if ('focus' in w) {
          await w.focus()
          await (w as WindowClient).navigate(target).catch(() => undefined)
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
