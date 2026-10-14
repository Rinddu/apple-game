/**
 * 최소한의 오프라인 캐시 (PRD §5 "최초 접속 이후 완전 오프라인 동작").
 * 같은 출처의 GET 요청을 캐시 우선으로 응답하고 배경에서 갱신한다.
 */
const CACHE = 'cave-sokoban-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(request)

      if (cached) {
        // 배경 갱신 — 다음 방문에 최신 파일을 쓴다.
        fetch(request)
          .then((response) => response.ok && cache.put(request, response.clone()))
          .catch(() => {})
        return cached
      }

      try {
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      } catch (error) {
        if (request.mode === 'navigate') {
          const fallback = await cache.match('./index.html')
          if (fallback) return fallback
        }
        throw error
      }
    })(),
  )
})
