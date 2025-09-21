/* ===== Service Worker – Gestor Floresca (PWA) ===== */

const APP_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${APP_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${APP_VERSION}`;
const API_CACHE     = `api-${APP_VERSION}`;

/* Ajustá esto si tu app no está en raíz */
const APP_SCOPE = self.registration.scope || '/';

/* RUTA DE TU API (ajustar si cambia en prod) */
const API_BASE = 'http://localhost:8080';

/* Recursos del “app shell” que queremos disponibles offline */
const PRECACHE_URLS = [
  `${APP_SCOPE}`,                 // fallback de navegación (raíz)
  `${APP_SCOPE}index.html`,
  `${APP_SCOPE}offline.html`,
  `${APP_SCOPE}manifest.webmanifest`,
  // Estilos y scripts propios
  `${APP_SCOPE}assets/styles.css`,
  `${APP_SCOPE}assets/app.js`,
  // Iconos (ajustar nombres/paths reales)
  `${APP_SCOPE}icons/icon-192.png`,
  `${APP_SCOPE}icons/icon-512.png`,
  // Sonidos si los usás
  `${APP_SCOPE}assets/sonidos/crear.mp3`,
  `${APP_SCOPE}assets/sonidos/estado.mp3`,
];

/* ================== Install ================== */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE_URLS);
    // Activa el SW nuevo sin esperar a que se cierren todas las tabs
    await self.skipWaiting();
  })());
});

/* ================== Activate ================== */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Limpia cachés viejas de otras versiones
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(k))
        .map(k => caches.delete(k))
    );
    // Navigation Preload (mejora primera carga en Chrome)
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

/* ================== Helpers ================== */
const isNavigationRequest = (req) =>
  req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));

const isSameOriginAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') ||
   url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg') || url.pathname.endsWith('.svg') ||
   url.pathname.endsWith('.webp') || url.pathname.endsWith('.ico') || url.pathname.endsWith('.mp3') ||
   url.pathname.endsWith('.woff') || url.pathname.endsWith('.woff2'));

const isApiGet = (url, req) =>
  url.origin + url.pathname.startsWith(API_BASE) && req.method === 'GET';

const isApiWrite = (url, req) =>
  url.origin + url.pathname.startsWith(API_BASE) && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE');

/* ================== Fetch ================== */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1) Navegación HTML: Network-first, fallback cache, y por último offline.html
  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      try {
        // Usá navigation preload si está
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const fresh = await fetch(request);
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, fresh.clone()).catch(()=>{});
        return fresh;
      } catch {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request) || await cache.match(`${APP_SCOPE}index.html`);
        return cached || cache.match(`${APP_SCOPE}offline.html`);
      }
    })());
    return;
  }

  // 2) Activos estáticos propios (CSS/JS/Imgs): Stale-While-Revalidate
  if (isSameOriginAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      const netFetch = fetch(request)
        .then((res) => {
          // Guardá nueva versión (si 200 OK)
          if (res && res.status === 200) cache.put(request, res.clone()).catch(()=>{});
          return res;
        })
        .catch(() => null);

      // devolvés rápido el cache y actualizás en segundo plano
      return cached || netFetch || new Response('', { status: 504 });
    })());
    return;
  }

  // 3) API GET (ej: /api/gestor/pedidos, /api/gestor/logs, /api/gestor/material):
  //    Network-first, fallback cache si offline
  if (isApiGet(url, request)) {
    event.respondWith((async () => {
      const cache = await caches.open(API_CACHE);
      try {
        const fresh = await fetch(request, { credentials: 'include' });
        if (fresh && fresh.status === 200) {
          cache.put(request, fresh.clone()).catch(()=>{});
        }
        return fresh;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'offline', detail: 'Sin conexión y sin cache.' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // 4) API de escritura (POST/PUT/DELETE):
  //    Requieren red. Si querés cola offline, ver sección “Opcional: cola offline”.
  if (isApiWrite(url, request)) {
    event.respondWith((async () => {
      try {
        return await fetch(request.clone());
      } catch {
        // Sin cola: devolvemos 503 y el front puede avisar al usuario.
        return new Response(JSON.stringify({ error: 'offline', detail: 'Operación requiere conexión.' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // 5) Todo lo demás: intenta red y cae a cache si existe.
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cached = await cache.match(request);
      return cached || new Response('', { status: 504 });
    }
  })());
});

/* ================== Mensajería (opcional) ================== */
// Podés usar postMessage desde el front para, por ejemplo, forzar limpiar cachés o precargar rutas.
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'CLEAR_CACHES') {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    event.ports[0]?.postMessage({ ok: true });
  }
});
