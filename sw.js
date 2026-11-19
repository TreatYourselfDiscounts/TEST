/* TreatYourselfDiscounts app shell, v2: the page itself is NEVER served
   stale. Navigations always try the network first and only fall back to
   the cache when offline, so a new site version shows on the next visit.
   Icons and the manifest may be cached; they change rarely. */
const CACHE = "tyd-staging-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "./manifest.json",
        "./icon-192.png",
        "./icon-512.png",
        "./icon-maskable-512.png",
        "./apple-touch-icon.png",
        /* 404 page: precached so an unknown URL can show the Pond's
           not-found page even offline, instead of a stale homepage. */
        "./404.html",
      ]).catch(() => {})
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          } else if (res.status === 404) {
            /* A missing page must never be cached as the homepage, and
               any stale homepage previously cached under this bad URL
               is dropped, so the 404 page shows on the next visit. */
            caches.open(CACHE).then((cache) => cache.delete(event.request));
          }
          return res;
        })
        .catch(() =>
          caches.match(event.request).then(
            (hit) => hit || caches.match("./404.html")
          )
        )
    );
    return;
  }
  const url = new URL(event.request.url);
  const isCode =
    url.origin === self.location.origin &&
    (event.request.destination === "script" ||
      event.request.destination === "style" ||
      /\.(?:js|css)$/.test(url.pathname) ||
      /news-meta\.json$/.test(url.pathname));
  if (isCode) {
    /* Scripts, styles, and the Pond Post edition marker: network first
       so layout fixes and new editions land on the next load instead of
       waiting for a cache sweep; cache is the offline fallback only. */
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ||
        fetch(event.request).then((res) => {
          if (res.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
    )
  );
});
