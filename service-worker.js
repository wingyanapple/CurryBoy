/* CurryBoy 營業小助理 — service worker
   v3：改用「network-first」，每次有網絡都攞最新檔案，
   只有冇網絡先用快取。咁就唔會再卡住舊版 app.js / 舊 key。 */
const CACHE = "curryboy-v3";
const SHELL = [
  "./","./index.html","./style.css","./app.js",
  "./manifest.json","./icon-192.png","./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;        // Supabase / CDN：直接行網絡
  if (e.request.method !== "GET") return;

  // network-first：先攞最新，失敗（離線）先用快取
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((c) => c || caches.match("./index.html")))
  );
});
