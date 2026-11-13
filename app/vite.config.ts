/**
 * Vite-Konfiguration der neuen TAP2-Coach-App (Branch `dev`, Ordner app/).
 *
 * Statische, lokal-first PWA – kein eigener Server nötig:
 * - TanStack Router (dateibasiert): Seiten liegen in src/routes/, routeTree.gen.ts wird erzeugt.
 * - Tailwind v4 mit eigenen Tokens (src/theme/tokens.css).
 * - vite-plugin-pwa: Service Worker mit Precache → die App läuft nach dem ersten Besuch offline,
 *   Updates kommen beim nächsten Start (wie in der Live-App).
 * Hosting: beliebiges statisches CDN, z. B. Cloudflare Pages Free (siehe docs/ENTWICKLUNG.md).
 */
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: { port: 8080 },
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt", // Nutzer entscheidet, wann neu geladen wird – nie mitten in einer Lernrunde
      includeAssets: ["favicon.png", "icon-192.png"],
      manifest: {
        name: "TAP2 Prüfungscoach",
        short_name: "TAP2 Coach",
        description: "Lern-App für die Abschlussprüfung Teil 2 – Fachinformatik Anwendungsentwicklung",
        lang: "de",
        start_url: "/",
        display: "standalone",
        background_color: "#f6f7f9",
        theme_color: "#172033",
        icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,json,wasm}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // Katalog-Chunk (~1 MB) muss offline verfügbar sein
        navigateFallback: "/index.html",
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      // Katalog als eigener Chunk: Bei App-Updates ohne Inhaltsänderung bleibt er im Cache.
      output: { codeSplitting: { groups: [{ name: "catalog", test: /src[\\/]content[\\/]generated/ }, { name: "vendor", test: /node_modules/ }] } },
    },
  },
  test: { environment: "node" },
});
