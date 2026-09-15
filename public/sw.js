/*
 * ScoutBase Campfire service worker: keeps the book readable with no signal.
 *
 * The book and the export page are saved on the device together with every
 * script, style, font and image they refer to, so a saved page still searches,
 * switches section and changes reading mode. With signal, pages come from the
 * network and the saved copy is refreshed; with no signal, or one bar that
 * takes too long, the saved copy is shown instead.
 *
 * Admin, sign-in and anything that is not a GET are never touched: they go
 * straight to the network and are never saved.
 *
 * Bump VERSION when this file's behaviour changes; the old caches are cleared.
 */
const VERSION = 'v1';
const PAGES = `campfire-pages-${VERSION}`;
const ASSETS = `campfire-assets-${VERSION}`;

/** Pages saved for reading offline. */
const SAVED = ['/', '/export'];

/** Pages that need a connection anyway; offline they get the notice below. */
const ONLINE_ONLY = ['/submit'];

const OFFLINE = '/offline.html';

/** Small files saved up front: the offline notice, the icons, the PDF logo. */
const EXTRAS = [
  OFFLINE,
  '/manifest.webmanifest',
  '/icon.svg',
  '/favicon.ico',
  '/apple-icon.png',
  '/icons/icon-192.png',
  '/scout-mark.png',
];

/** A page slower than this is probably one bar of signal: show the saved copy. */
const PATIENCE_MS = 4000;

/** Unreferenced scripts older than this are cleared out after a deploy. */
const ASSET_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const assets = await caches.open(ASSETS);
      // One missing file must not stop the rest being saved.
      await Promise.allSettled(EXTRAS.map((path) => assets.add(path)));
      await Promise.allSettled(SAVED.map((path) => savePage(path)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, ASSETS]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('campfire-') && !keep.has(n)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    if (SAVED.includes(url.pathname)) event.respondWith(savedPage(event, url));
    else if (ONLINE_ONLY.includes(url.pathname)) {
      event.respondWith(fetch(request).catch(offlinePage));
    }
    // Everything else, admin and sign-in included, is left to the browser.
    return;
  }

  // Build output is content-hashed, so a saved copy is always the right one.
  if (url.pathname.startsWith('/_next/static/') || url.pathname === '/_next/image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Same name, possibly new content: answer from the cache, refresh behind.
  if (url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/icons/') || EXTRAS.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request));
  }
});

/**
 * Network first, saved copy on failure or after PATIENCE_MS. The network
 * response still refreshes the saved copy when it arrives late.
 */
async function savedPage(event, url) {
  const network = fetch(event.request);

  // Registered before anything reads the body, so the clone is always possible.
  event.waitUntil(
    network
      .then((response) => {
        if (url.search || !isSaveable(response)) return undefined;
        return savePage(url.pathname, response.clone());
      })
      .catch(() => undefined),
  );

  const slow = new Promise((resolve) => setTimeout(resolve, PATIENCE_MS, 'slow'));
  const first = await Promise.race([network.catch(() => 'failed'), slow]);
  if (first !== 'slow' && first !== 'failed') return first;

  const saved = await (await caches.open(PAGES)).match(url.pathname);
  if (saved) return saved;

  // Never saved: all there is to do is keep waiting, or admit defeat.
  try {
    return await network;
  } catch {
    return offlinePage();
  }
}

function isSaveable(response) {
  return response.ok && response.type === 'basic' && !response.redirected;
}

/** Save a page and everything it needs to work. */
async function savePage(path, response) {
  const res = response ?? (await fetch(path, { cache: 'no-cache' }));
  if (!isSaveable(res)) return;

  const html = await res.clone().text();
  await (await caches.open(PAGES)).put(path, res);

  const needed = assetsIn(html);
  await saveAssets(needed);

  // Stylesheets pull in the web fonts, which the HTML itself never names.
  const assets = await caches.open(ASSETS);
  const css = [...needed].filter((u) => u.endsWith('.css'));
  const fonts = new Set();
  for (const href of css) {
    const hit = await assets.match(href);
    if (hit) assetsIn(await hit.text()).forEach((u) => fonts.add(u));
  }
  await saveAssets(fonts);

  await pruneAssets();
}

/** Every build file and optimised image a page or stylesheet refers to. */
function assetsIn(text) {
  const found = new Set();
  // Also matches the chunk lists inside the inline React payload, where the
  // quotes are escaped, so client components loaded later are covered too.
  for (const m of text.matchAll(/\/_next\/static\/[\w\-.~%/]+\.(?:js|css|woff2?|ttf|png|jpe?g|svg|webp|avif)/g)) {
    found.add(m[0]);
  }
  for (const m of text.matchAll(/\/_next\/image\?url=[^"'\s\\)]+/g)) {
    found.add(m[0].replace(/&amp;/g, '&'));
  }
  return found;
}

async function saveAssets(urls) {
  const assets = await caches.open(ASSETS);
  await Promise.allSettled(
    [...urls].map(async (u) => {
      if (await assets.match(u, { ignoreVary: true })) return;
      const res = await fetch(u);
      if (isSaveable(res)) await assets.put(u, res);
    }),
  );
}

/**
 * Each deploy brings new hashed files, so old ones would pile up. Clear any
 * no saved page still refers to, once they are old enough that nothing open
 * could still want them.
 */
async function pruneAssets() {
  const pages = await caches.open(PAGES);
  const referenced = new Set();
  for (const req of await pages.keys()) {
    const res = await pages.match(req);
    if (res) assetsIn(await res.text()).forEach((u) => referenced.add(u));
  }

  const assets = await caches.open(ASSETS);
  const now = Date.now();
  for (const req of await assets.keys()) {
    const { pathname, search } = new URL(req.url);
    if (!pathname.startsWith('/_next/')) continue;
    if (referenced.has(pathname + search)) continue;
    const res = await assets.match(req);
    const date = Date.parse(res?.headers.get('date') ?? '');
    if (Number.isFinite(date) && now - date > ASSET_MAX_AGE_MS) await assets.delete(req);
  }
}

async function cacheFirst(request) {
  const assets = await caches.open(ASSETS);
  const hit = await assets.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (isSaveable(res)) await assets.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(event, request) {
  const assets = await caches.open(ASSETS);
  const hit = await assets.match(request, { ignoreVary: true });
  const refresh = fetch(request).then(async (res) => {
    if (isSaveable(res)) await assets.put(request, res.clone());
    return res;
  });
  if (hit) {
    event.waitUntil(refresh.catch(() => undefined));
    return hit;
  }
  return refresh;
}

async function offlinePage() {
  const hit = await (await caches.open(ASSETS)).match(OFFLINE);
  return (
    hit ??
    new Response('No signal. The book will be back when you are.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  );
}
