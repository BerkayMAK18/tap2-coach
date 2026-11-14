/**
 * Service Worker – Verhalten wie sw.js der Live-App:
 * - Seiten (Navigation): Netz zuerst → online immer die neueste Version; nur ohne Netz die zuletzt geladene Seite.
 * - Programmdateien (JS, CSS, Schriften, Bilder, WebAssembly): aus dem Vorab-Cache. Sie tragen eine Prüfsumme im
 *   Dateinamen, eine neue Version hat also neue Namen – veraltete Dateien sind ausgeschlossen.
 * - Neue Version: wartet, bis die Seite „Neu laden“ bestätigt (Nachricht SKIP_WAITING), nie mitten in einer Lernrunde.
 * Gebaut von vite-plugin-pwa (strategies: "injectManifest"), self.__WB_MANIFEST wird beim Build eingesetzt.
 */
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

// Typen des Service-Worker-Kontexts schlank halten (tsconfig nutzt die DOM-Bibliothek)
type Entry = string | { url: string; revision: string | null };
type FetchEv = Event & { request: Request; respondWith(r: Promise<Response>): void };
const sw = self as unknown as { skipWaiting(): Promise<void>; addEventListener(t: string, f: (e: never) => void): void };
// @ts-expect-error – wird beim Build durch die Dateiliste ersetzt (muss wörtlich so heißen)
const MANIFEST: Entry[] = self.__WB_MANIFEST;

const PAGES = "tap2-pages", SHELL = "/index.html";

// Zuerst die Navigation (eigener Handler, damit die Seite nie aus dem Vorab-Cache kommt)
sw.addEventListener("fetch", (e: FetchEv) => {
  if (e.request.method !== "GET" || e.request.mode !== "navigate") return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); void caches.open(PAGES).then((c) => c.put(SHELL, copy)); }
        return res;
      })
      .catch(async () => (await caches.match(SHELL, { cacheName: PAGES })) ?? Response.error()),
  );
});

// Programmdateien aus dem Vorab-Cache; HTML ist bewusst nicht darin (siehe oben)
precacheAndRoute(MANIFEST.filter((e) => !(typeof e === "string" ? e : e.url).endsWith(".html")));
cleanupOutdatedCaches();

sw.addEventListener("message", (e: MessageEvent) => { if (e.data && (e.data as { type?: string }).type === "SKIP_WAITING") void sw.skipWaiting(); });
