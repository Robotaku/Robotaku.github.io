// 簡易Service Worker: ネットワーク優先、失敗したら保存済みのファイルを返す。
// 相対パスで動くので、/dots-and-boxes/play/ のようなサブフォルダでも使える。
// ファイルを更新したら、VERSION を変えると古い保存が消える。
const VERSION = 'v2';
const CACHE = `dots-and-boxes-${VERSION}`;

self.addEventListener('install', (event) => {
  // 起動に必要な最小限のファイルを先に保存しておく(初回オンライン時)
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['./', 'manifest.webmanifest', 'icon.svg', 'icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./'))),
  );
});
