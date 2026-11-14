/**
 * Prüfung: laufende Klausur (UI.run, gespeichert unter tap2coach-run wie in der Live-App), Auswahl (UI.pk) und
 * Rückfragen (UI.confirm). Auswahl und Rückfragen überdauern Seitenwechsel, nicht das Neuladen.
 * Ergebnisse gehen über den Lernstand-Speicher (store/progress.ts) in S.runs.
 */
import { create } from "zustand";
import { finishReal, restoreRun, startRun, submitRun, type Mode, type PkRun } from "@/lib/pruefung";
import { useProgress } from "./progress";

export const KEY_RUN = "tap2coach-run";
const keep = (r: PkRun | null) => { try { if (r) localStorage.setItem(KEY_RUN, JSON.stringify(r)); else localStorage.removeItem(KEY_RUN); } catch { /* privat */ } };
const load = () => { try { return restoreRun(JSON.parse(localStorage.getItem(KEY_RUN) || "null")); } catch { return null; } };

type Confirm = "submit" | "cancel" | number | null; // number: Ergebnis mit diesem ts löschen
type Store = {
  run: PkRun | null; pk: { mode: Mode; teil: string }; confirm: Confirm; now: number;
  setPk: (pk: Partial<{ mode: Mode; teil: string }>) => void;
  setConfirm: (c: Confirm) => void;
  start: (mode?: Mode, teil?: string) => void;
  /** Laufende Prüfung ändern und speichern */
  patch: (f: (r: PkRun) => PkRun) => void;
  submit: (auto: boolean) => void;
  finish: () => void;
  close: () => void;
  deleteRun: (ts: number) => void;
};

export const usePruefung = create<Store>((set, get) => ({
  run: typeof window === "undefined" ? null : load(),
  pk: { mode: "sim", teil: "t1" },
  confirm: null,
  now: Date.now(),
  setPk: (pk) => set({ pk: { ...get().pk, ...pk } }),
  setConfirm: (confirm) => set({ confirm }),
  start: (mode, teil) => {
    const pk = { mode: mode ?? get().pk.mode, teil: teil ?? get().pk.teil };
    const run = startRun(useProgress.getState().S, pk.mode, pk.teil);
    keep(run); set({ pk, run, confirm: null, now: Date.now() });
  },
  patch: (f) => { const r = get().run; if (!r) return; const run = f(r); keep(run); set({ run }); },
  submit: (auto) => {
    const r = get().run; if (!r) return;
    const P = useProgress.getState(), x = submitRun(P.S, r, auto);
    if (x.S !== P.S) P.applySynced(x.S); // Simulation: Antworten und Ergebnis speichern
    keep(x.run); set({ run: x.run, confirm: null });
  },
  finish: () => {
    const r = get().run; if (!r) return;
    const P = useProgress.getState(), x = finishReal(P.S, r);
    void import("./livesync").then((m) => x.evs.forEach(([k, v]) => m.recordEv("e", k, v))); // wie syncEv("e", …) in logCause()
    P.applySynced(x.S);
    keep(x.run); set({ run: x.run });
  },
  close: () => { keep(null); set({ run: null, confirm: null }); },
  deleteRun: (ts) => {
    const P = useProgress.getState();
    void import("./livesync").then((m) => m.recordEv("r", String(ts))); // Lösch-Ereignis für den Sync
    P.applySynced({ ...P.S, runs: P.S.runs.filter((x) => x.ts !== ts) });
    set({ confirm: null });
  },
}));

/** Prüfung wird geschrieben: Fokus-Ansicht, keine Suche (wie die Live-App) */
export const examWriting = () => { const r = usePruefung.getState().run; return !!r && r.phase === "write"; };

// Takt für die Uhr, nur solange sie läuft
if (typeof window !== "undefined") setInterval(() => { const r = usePruefung.getState().run; if (r && r.on && r.phase === "write") usePruefung.setState({ now: Date.now() }); }, 500);
