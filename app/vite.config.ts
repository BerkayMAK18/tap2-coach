/**
 * Vite-Konfiguration der neuen TAP2-Coach-App (Branch `dev`, Ordner app/).
 *
 * Statische, lokal-first PWA – kein eigener Server nötig:
 * - TanStack Router (dateibasiert): Seiten liegen in src/routes/, routeTree.gen.ts wird erzeugt.
 * - Tailwind v4 mit eigenen Tokens (src/theme/tokens.css).
 * - vite-plugin-pwa mit eigenem Service Worker (src/sw.ts): Seiten Netz zuerst (immer aktuell), Programmdateien
 *   aus dem Vorab-Cache, offline nutzbar – wie sw.js der Live-App.
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
      strategies: "injectManifest", // eigener Service Worker (src/sw.ts): Seiten Netz zuerst wie in der Live-App
      srcDir: "src",
      filename: "sw.ts",
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
      injectManifest: {
        globPatterns: ["**/*.{js,css,woff2,png,svg,json,wasm}"], // ohne HTML: Seiten kommen immer zuerst aus dem Netz
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // Katalog-Chunk (~1 MB) muss offline verfügbar sein
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      // Katalog als eigener Chunk: Bei App-Updates ohne Inhaltsänderung bleibt er im Cache.
      // Code-Editor und SQLite nur für Code-/SQL-Karten: eigene Chunks, erst bei Bedarf geladen (nicht im vendor-Chunk).
      output: { codeSplitting: { groups: [
        { name: "catalog", test: /src[\\/]content[\\/]generated/ },
        { name: "codemirror", test: /node_modules[\\/](@codemirror|@lezer|style-mod|w3c-keyname|crelt)[\\/]/, priority: 2 },
        { name: "sqljs", test: /node_modules[\\/]sql\.js[\\/]/, priority: 2 },
        { name: "vendor", test: /node_modules/ },
      ] } },
    },
  },
  test: { environment: "node" },
});
