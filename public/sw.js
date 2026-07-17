const CACHE_NAME = 'sn-pos-cache-v4';
const APP_SHELL = '/index.html';
const STATIC_ASSETS = [
  '/',
  APP_SHELL,
  '/manifest.webmanifest',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

const staticDestinations = new Set(['style', 'script', 'worker', 'image', 'font', 'manifest']);

const isCacheableStaticRequest = (request, url) => {
  if (request.headers.has('range')) return false;
  if (url.pathname === '/sw.js') return false;
  return staticDestinations.has(request.destination) || url.pathname.startsWith('/assets/');
};

const isCacheableResponse = (response) =>
  response.status === 200 && response.type === 'basic' && !response.headers.has('content-range');

const cacheResponse = (event, request, response, cacheKey = request) => {
  // Clone immediately: returning the original response allows the browser to
  // consume its body before an asynchronous cache write begins.
  const responseForCache = response.clone();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.put(cacheKey, responseForCache))
      .catch(() => undefined),
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase API/Auth/REST/Storage/RPC/Realtime requests are cross-origin for
  // this app and are intentionally left entirely to the browser network stack.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        if (isCacheableResponse(networkResponse)) {
          // Store the fresh app shell, not each individual SPA route.
          cacheResponse(event, request, networkResponse, APP_SHELL);
        }
        return networkResponse;
      } catch (error) {
        const fallback = await caches.match(APP_SHELL);
        if (fallback) return fallback;
        throw error;
      }
    })());
    return;
  }

  if (!isCacheableStaticRequest(request, url)) return;

  event.respondWith((async () => {
    const cachedResponse = await caches.match(request);

    try {
      const networkResponse = await fetch(request);
      if (isCacheableResponse(networkResponse)) cacheResponse(event, request, networkResponse);
      return cachedResponse || networkResponse;
    } catch (error) {
      if (cachedResponse) return cachedResponse;
      throw error;
    }
  })());
});
