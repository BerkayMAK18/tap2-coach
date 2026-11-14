/**
 * Tutor-Ansicht: aktuelle Aufgabe und Einschätzung des Tutors je Thema (rechte Leiste).
 * - Aufgabe: nur für die laufende Sitzung (sessionStorage, wie der Chat).
 * - Einschätzung je Thema: bleibt auf diesem Gerät (localStorage, eigener Schlüssel – die Brücke nutzt tap2coach-tutor).
 * Alles bleibt lokal; nichts davon geht in Sync oder Sicherung.
 */
import { create } from "zustand";
import type { StandEntry, TutorTask } from "@/lib/tutor-blocks";

/** Tutor freigeschaltet auf diesem Gerät (/tutor?premium=1) – zeigt den Menüpunkt; der Server prüft zusätzlich die Admin-Rolle */
export const PREMIUM_KEY = "tap2coach-premium";
export const isPremium = () => { try { return localStorage.getItem(PREMIUM_KEY) === "1"; } catch { return false; } };

const KEY_TASK = "tap2coach-tutor-task", KEY_STAND = "tap2coach-tutor-stand";
const read = <T,>(s: Storage | undefined, k: string, d: T): T => { try { const v = s ? JSON.parse(s.getItem(k) || "null") : null; return v ?? d; } catch { return d; } };
const write = (s: Storage | undefined, k: string, v: unknown) => { try { if (v == null) s?.removeItem(k); else s?.setItem(k, JSON.stringify(v)); } catch { /* privat */ } };
const ss = typeof sessionStorage === "undefined" ? undefined : sessionStorage, ls = typeof localStorage === "undefined" ? undefined : localStorage;

export type SideTab = "lernstand" | "aufgabe";
type Store = {
  task: TutorTask | null; stand: Record<string, StandEntry>; tab: SideTab;
  setTask: (t: TutorTask | null) => void;
  mergeStand: (s: Record<string, StandEntry>) => void;
  setTab: (t: SideTab) => void;
};
export const useTutor = create<Store>((set, get) => ({
  task: read<TutorTask | null>(ss, KEY_TASK, null),
  stand: read<Record<string, StandEntry>>(ls, KEY_STAND, {}),
  tab: "lernstand",
  setTask: (task) => { write(ss, KEY_TASK, task); set({ task }); },
  mergeStand: (s) => { if (!Object.keys(s).length) return; const stand = { ...get().stand, ...s }; write(ls, KEY_STAND, stand); set({ stand }); },
  setTab: (tab) => set({ tab }),
}));
