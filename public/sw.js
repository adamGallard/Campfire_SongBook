/*
 * ScoutBase Campfire, Pioneering, Bushcraft and Games service worker: keeps the book readable
 * with no signal. Each book is its own site, so each has its own worker and
 * caches; the icon and offline addresses below are the same in both, and
 * next.config.mjs points them at the right book's files.
 *
 * The book and the planner are saved on the device together with every
 * script, style, font and image they refer to, so a saved page still searches,
 * switches section and changes reading mode. With signal, pages come from the
 * network and the saved copy is refreshed; with no signal, or one bar that
 * takes too long, the saved copy is shown instead.
 *
 * Admin, sign-in and anything that is not a GET are never touched: they go
 * straight to the network and are never saved.
 *
 * Bump VERSION when this file's behaviour changes, or when a file in EXTRAS
 * changes under the same name (as the icons did); the old caches are cleared.
 */
const VERSION = 'v4';
const PAGES = `campfire-pages-${VERSION}`;
const ASSETS = `campfire-assets-${VERSION}`;

/** Pages saved for reading offline. */
const SAVED = ['/', '/plan'];

/** Old addresses, sent on to their new page even with no signal. */
const MOVED = { '/export': '/plan' };

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
      // But the pages must all save, with everything they need: activate then
      // deletes the previous caches, so a half-saved install would leave a
      // phone with no working offline copy. Failing here keeps the old worker,
      // and the browser tries again on a later visit.
      await Promise.all(SAVED.map((path) => savePage(path)));
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
    else if (MOVED[url.pathname]) {
      event.respondWith(fetch(request).catch(() => Response.redirect(MOVED[url.pathname], 302)));
    }
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

/**
 * Save a page and everything it needs to work. The files go in first and the
 * page only once they are all there: saved the other way round, a download cut
 * short leaves a page that loads offline without its scripts, and the working
 * copy it replaced is gone. Throws when the page could not be saved whole.
 */
async function savePage(path, response) {
  const res = response ?? (await fetch(path, { cache: 'no-cache' }));
  if (!isSaveable(res)) throw new Error(`Could not fetch ${path}`);

  const html = await res.clone().text();
  const needed = assetsIn(html);
  if (!(await saveAssets(needed))) throw new Error(`Could not save what ${path} needs`);

  // Stylesheets pull in the web fonts, which the HTML itself never names.
  const assets = await caches.open(ASSETS);
  const css = [...needed].filter((u) => u.endsWith('.css'));
  const fonts = new Set();
  for (const href of css) {
    const hit = await assets.match(href);
    if (hit) assetsIn(await hit.text()).forEach((u) => fonts.add(u));
  }
  await saveAssets(fonts);

  const pages = await caches.open(PAGES);
  const before = await pages.match(path);
  const changed = !before || (await before.text()) !== html;
  await pages.put(path, res);

  // Only a changed page can have stopped needing something.
  if (changed) await pruneAssets();
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

/**
 * What a script or stylesheet loads in turn, which the page never names: the
 * chunks a script loads on demand (the PDF code, from the planner) and the
 * fonts a stylesheet points at. Both are written relative, not as /_next/...
 */
function filesLoadedBy(path, text) {
  const found = assetsIn(text);
  for (const m of text.matchAll(/["'](static\/(?:chunks|css|media)\/[\w\-.~%/]+\.(?:js|css|woff2?))["']/g)) {
    found.add(`/_next/${m[1]}`);
  }
  for (const m of text.matchAll(/url\(\s*["']?(\.{1,2}\/[^"')\s]+)["']?\s*\)/g)) {
    found.add(new URL(m[1], self.location.origin + path).pathname);
  }
  return found;
}

/** Save each file not saved already; true when every one of them is saved. */
async function saveAssets(urls) {
  const assets = await caches.open(ASSETS);
  const results = await Promise.allSettled(
    [...urls].map(async (u) => {
      if (await assets.match(u, { ignoreVary: true })) return true;
      const res = await fetch(u);
      if (!isSaveable(res)) return false;
      await assets.put(u, res);
      return true;
    }),
  );
  return results.every((r) => r.status === 'fulfilled' && r.value);
}

/**
 * Each deploy brings new hashed files, so old ones would pile up. Clear any
 * no saved page still needs, once they are old enough that nothing open could
 * still want them. "Needs" follows the files the pages load in turn, so the
 * PDF code and the fonts are kept for as long as the pages that load them.
 */
async function pruneAssets() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const referenced = new Set();
  for (const req of await pages.keys()) {
    const res = await pages.match(req);
    if (res) assetsIn(await res.text()).forEach((u) => referenced.add(u));
  }
  // A Set visits what is added while iterating, so this follows every level.
  for (const u of referenced) {
    if (!/\.(?:js|css)$/.test(u)) continue;
    const hit = await assets.match(u, { ignoreVary: true });
    if (hit) filesLoadedBy(u, await hit.text()).forEach((f) => referenced.add(f));
  }

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
