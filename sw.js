/* 美容台帳 Service Worker */
var CACHE = 'biyou-daichou-v4';
var FONT_CACHE = 'biyou-daichou-fonts-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return Promise.all(ASSETS.map(function(a) {
        return c.add(a).catch(function() {});
      }));
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE && k !== FONT_CACHE) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  /* Google Fonts: キャッシュ優先＋ランタイムキャッシュ */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(function(hit) {
        if (hit) return hit;
        return fetch(e.request).then(function(res) {
          if (res && (res.ok || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(FONT_CACHE).then(function(c) { c.put(e.request, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  if (url.origin === location.origin) {
    /* アプリ本体（HTML）はネットワーク優先。オンラインなら最新、オフラインはキャッシュ */
    var isDoc = e.request.mode === 'navigate'
      || url.pathname === '/'
      || url.pathname.endsWith('/')
      || url.pathname.endsWith('/index.html');
    if (isDoc) {
      e.respondWith(
        fetch(e.request).then(function(res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function(c) { c.put('./index.html', copy); });
          }
          return res;
        }).catch(function() {
          return caches.match(e.request).then(function(hit) { return hit || caches.match('./index.html'); });
        })
      );
      return;
    }
    /* その他: キャッシュ優先 */
    e.respondWith(
      caches.match(e.request).then(function(hit) {
        if (hit) return hit;
        return fetch(e.request).then(function(res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
          }
          return res;
        });
      })
    );
  }
});
