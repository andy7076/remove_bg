const CACHE_NAME = 'ai-bg-remover-static-v3'
const RUNTIME_CACHE = 'ai-bg-remover-runtime-v3'
const MODEL_CACHE = 'ai-bg-remover-models-v2'
const STATIC_ASSETS = ['/']
const MODEL_EXTENSIONS = /\.(?:onnx|wasm)$/i
const STATIC_EXTENSIONS = /\.(?:worker\.js|js|css|frag)$/i

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => ![CACHE_NAME, RUNTIME_CACHE, MODEL_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  const isSameOrigin = url.origin === self.location.origin
  const isModel =
    MODEL_EXTENSIONS.test(url.pathname) ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'huggingface.co'
  const isSameOriginStatic = isSameOrigin && STATIC_EXTENSIONS.test(url.pathname)

  if (!isSameOrigin && !isModel) {
    return
  }

  if (isModel) {
    event.respondWith(cacheFirst(request, MODEL_CACHE))
    return
  }

  event.respondWith(networkFirst(request, isSameOriginStatic ? CACHE_NAME : RUNTIME_CACHE))
})

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)

  if (cached) {
    return cached
  }

  const response = await fetch(request)
  await putSuccessfulResponse(request, response, cacheName)
  return response
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    await putSuccessfulResponse(request, response, cacheName)
    return response
  } catch (error) {
    const cached = await caches.match(request)

    if (cached) {
      return cached
    }

    throw error
  }
}

async function putSuccessfulResponse(request, response, cacheName) {
  if (!response || !response.ok) {
    return
  }

  const cache = await caches.open(cacheName)
  await cache.put(request, response.clone())
}
