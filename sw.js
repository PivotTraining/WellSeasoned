/* Well Seasoned service worker — installable PWA + offline shell.
   Deliberately conservative about caching so "every push deploys" and
   "nothing fake" both hold:
   - Navigations are NETWORK-FIRST, so a live deploy shows immediately when
     online; the cached shell is only the offline fallback.
   - Only SAME-ORIGIN static assets are cached (brand icons, /word art, og).
   - /api/* is never cached (showtimes, checkout, etc. must be live).
   - Cross-origin requests (Supabase votes/auth, TMDB, YouTube, Google Fonts)
     are NOT intercepted at all — always straight to network, so scores,
     votes and auth are never served stale.
   Bump CACHE to force old caches out on the next activate. */
var CACHE = 'ws-cache-v1';
var CORE = ['/', '/brand/icon-192.png', '/brand/icon-512.png', '/brand/apple-touch-180.png', '/manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // best-effort: don't fail the whole install if one asset 404s
      return Promise.all(CORE.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  // only handle our own origin; everything cross-origin goes straight to network
  if (url.origin !== self.location.origin) return;
  // never cache serverless API responses — they must be live
  if (url.pathname.indexOf('/api/') === 0) return;

  // navigations (the SPA document): network-first, refresh the offline shell,
  // fall back to the cached shell when offline
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') > -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('/', copy); });
        return res;
      }).catch(function () {
        return caches.match('/').then(function (m) { return m || caches.match(req); });
      })
    );
    return;
  }

  // same-origin static assets: stale-while-revalidate
  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
