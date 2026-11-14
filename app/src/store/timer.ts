/**
 * Timer (Theorie, später Übungsaufgaben) wie in der Live-App: Start → Countdown → läuft ins Minus → Stopp.
 * Wird nicht ausgewertet. Ein Timer gleichzeitig, gespeichert unter tap2coach-timer (gleiches Format).
 */
import { create } from "zustand";

export type Timer = { key: string; min: number; start: number; stop: number | null };
const KEY_TIMER = "tap2coach-timer";
const pad = (n: number) => String(n).padStart(2, "0");
export const fmtClock = (sec: number) => { const neg = sec < 0, a = Math.abs(Math.round(sec)), h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), x = a % 60; return (neg ? "−" : "") + (h ? h + ":" + pad(m) : m) + ":" + pad(x); };
export const tmLeft = (TM: Timer | null, now = Date.now()) => (TM ? TM.min * 60 - ((TM.stop || now) - TM.start) / 1000 : 0);
export const tmState = (TM: Timer | null, key: string) => (!TM || TM.key !== key ? "idle" : TM.stop ? "done" : "run");

const load = (): Timer | null => { try { const t = JSON.parse(localStorage.getItem(KEY_TIMER) || "null"); return t && typeof t.key === "string" && Number.isFinite(t.min) && Number.isFinite(t.start) ? t : null; } catch { return null; } };
const keep = (TM: Timer | null) => { try { if (TM) localStorage.setItem(KEY_TIMER, JSON.stringify(TM)); else localStorage.removeItem(KEY_TIMER); } catch { /* privat */ } };

export const useTimer = create<{ TM: Timer | null; now: number; start: (key: string, min: number) => void; stop: () => void; reset: () => void }>((set, get) => ({
  TM: typeof window === "undefined" ? null : load(),
  now: Date.now(),
  start: (key, min) => { const TM = { key, min, start: Date.now(), stop: null }; keep(TM); set({ TM, now: Date.now() }); },
  stop: () => { const TM = get().TM; if (TM && !TM.stop) { const t = { ...TM, stop: Date.now() }; keep(t); set({ TM: t }); } },
  reset: () => { keep(null); set({ TM: null }); },
}));
// Sekundentakt nur, solange ein Timer läuft
if (typeof window !== "undefined") setInterval(() => { const TM = useTimer.getState().TM; if (TM && !TM.stop) useTimer.setState({ now: Date.now() }); }, 1000);
