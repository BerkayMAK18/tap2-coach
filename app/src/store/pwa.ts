/**
 * App & Offline (PWA der Live-App): installierbar (beforeinstallprompt), installiert (standalone), offline bereit
 * (Service Worker aktiv) bzw. nicht verfügbar, iPhone/iPad (Hinweis „Zum Home-Bildschirm“).
 * Den Service Worker registriert vite-plugin-pwa (Grundgerüst, UpdatePrompt); hier wird nur sein Zustand gelesen.
 */
import { create } from "zustand";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };
type Pwa = { prompt: BIP | null; offline: boolean; swFail: boolean; ios: boolean; standalone: boolean };

const nav = typeof navigator === "undefined" ? null : navigator;
export const usePwa = create<Pwa>(() => ({
  prompt: null, offline: false,
  swFail: !nav || !("serviceWorker" in nav) || !/^https?:$/.test(location.protocol),
  ios: !!nav && /iphone|ipad|ipod/i.test(nav.userAgent),
  standalone: typeof window !== "undefined" && ((typeof window.matchMedia === "function" && matchMedia("(display-mode: standalone)").matches) || (nav as Navigator & { standalone?: boolean })?.standalone === true),
}));

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); usePwa.setState({ prompt: e as BIP }); });
  window.addEventListener("appinstalled", () => usePwa.setState({ prompt: null, standalone: true }));
  if (!usePwa.getState().swFail) {
    // Ohne registrierten Service Worker (z. B. im Entwicklungsmodus) bleibt „wird eingerichtet …“ stehen – wie in der Live-App ohne sw.js
    navigator.serviceWorker.ready.then(() => usePwa.setState({ offline: true })).catch(() => usePwa.setState({ swFail: true }));
  }
}

/** „App installieren“: Dialog des Browsers zeigen (danach ist der Hinweis verbraucht) */
export async function installApp() {
  const pr = usePwa.getState().prompt; if (!pr) return;
  usePwa.setState({ prompt: null });
  await pr.prompt(); try { await pr.userChoice; } catch { /* abgebrochen */ }
}
