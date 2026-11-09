// TAP2 Prüfungscoach – Service Worker
// Seite: Netz zuerst (immer aktuell), ohne Netz aus dem Cache. Dateien: aus dem Cache, im Hintergrund aktualisiert.
const CACHE = "tap2-v3";
const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/raven.svg", "./icons/favicon-32.png",
  "./fonts/dm-sans-latin.woff2", "./fonts/plus-jakarta-sans-latin.woff2", "./fonts/jetbrains-mono-latin.woff2"
];
const EXTRA = ["./vendor/codemirror.min.js", "./vendor/sqljs/sql-wasm.js", "./vendor/sqljs/sql-wasm.wasm", "./vendor/qrcode.min.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(async (c) => { await c.addAll(CORE); try { await c.addAll(EXTRA); } catch (err) { /* Editor/SQL notfalls später nachladen */ } })
      .then(() => self.skipWaiting())
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
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (new URL(req.url).pathname.endsWith("/version.json")) return; // Versionsprüfung immer direkt übers Netz

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); }
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req)
        .then((res) => { if (res.ok && !new URL(req.url).search) c.put(req, res.clone()); return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
