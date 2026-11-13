/**
 * Vite-Konfiguration der neuen TAP2-Coach-App (Branch `dev`).
 *
 * - TanStack Start (SSR + Server-Funktionen), React, Tailwind v4.
 * - Cloudflare-Plugin nur beim Build: erzeugt den Worker, der auf Cloudflare läuft (wrangler.jsonc).
 *   Im Dev-Server gibt es keine workerd-Laufzeit, deshalb dort ohne.
 * - Die Lovable-Plugins der Vorlage (componentTagger, mockupPreviewPlugin) sind entfernt.
 */
import path from "path";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig(({ command }) => {
  const useCloudflare = command === "build";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    plugins: [
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ...(useCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  };
});
