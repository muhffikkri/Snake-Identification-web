/*
  Offline shell for a field tool. Two rules:
  1. Navigations resolve to the cached shell when the network is gone, so the
     app opens on a dead connection.
  2. Same-origin assets are cached on first fetch and served from cache while a
     background refresh runs, so a second visit works offline.

  Build output is content-hashed, so the asset list is discovered at runtime
  from the manifest of the shell document rather than hardcoded. That means the
  first online visit is what makes the app available offline.
*/
const CACHE_NAME = 'snakebiteai-shell-v3';

const SHELL = ['/', '/index.html', '/manifest.json', '/Logo_1.webp'];

/*
  The reference photographs are what identification runs against. Without them
  cached, the feature is the one thing that breaks offline, which is the exact
  case the app exists for. They total about 3.4 MB, paid once on first visit.
*/
const REFERENCE_SET = [
  '/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg',
  '/dataset/Acanthophis_laevis_obs137275705_photo234421463.jpg',
  '/dataset/Acanthophis_laevis_obs19025516_photo29178993.jpg',
  '/dataset/Ahaetulla_fasciolata_obs202932892_photo358471931.jpg',
  '/dataset/Ahaetulla_fasciolata_obs310503736_photo560406804.jpg',
  '/dataset/Ahaetulla_prasina_0003.jpg',
  '/dataset/Ahaetulla_rufusoculara_obs252803925_photo456126350.jpg',
];

/** Third-party origins we cache opportunistically, never block on. */
const OPPORTUNISTIC = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com|tile\.openstreetmap\.org|[a-c]\.tile\.openstreetmap\.org)/;

/**
 * Build output is content-hashed, so the asset list is read out of the shell
 * document rather than hardcoded. This runs at install time, because by the
 * time a page is controlled the first navigation has already happened and the
 * hashed bundle would never be requested again until the next online load.
 */
async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all([...SHELL, ...REFERENCE_SET].map((url) => cache.add(url).catch(() => undefined)));

  try {
    const response = await cache.match('/index.html');
    if (!response) return;
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
    await Promise.all(assets.map((url) => cache.add(url).catch(() => undefined)));
  } catch {
    // A shell we cannot parse still works once the network returns.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return hit ?? network ?? Response.error();
}

async function handleNavigation() {
  try {
    const response = await fetch('/index.html');
    const cache = await caches.open(CACHE_NAME);
    cache.put('/index.html', response.clone());
    return response;
  } catch {
    const cached = await caches.match('/index.html');
    if (cached) {
      return cached;
    }
    return new Response('<h1>SnakeBiteAI is not cached yet</h1><p>Open the app once with a connection so it can store itself for offline use.</p>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // The batch sync endpoint must never be answered from cache.
  if (url.pathname.includes('/api/v2/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation());
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (OPPORTUNISTIC.test(request.url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});