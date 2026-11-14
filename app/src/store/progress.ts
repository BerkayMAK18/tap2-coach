/**
 * Lernstand-Speicher (Zustand). Lokal-first: Alles liegt im Browser (localStorage, Schlüssel wie in der Live-App).
 *
 * - Laden: normalize() bringt jeden Stand ins aktuelle Format und entschärft Fremddaten.
 * - Speichern: nach jeder Änderung; schlägt es fehl (privater Modus, Speicher voll), zeigt storeOk=false das an.
 * - Mehrere Tabs: Änderungen aus anderen Tabs kommen über das storage-Event herein.
 * - Später: Sync (verschlüsselt, Supabase) hängt sich an save() an – siehe docs/ARCHITEKTUR.md.
 */
import { create } from "zustand";
import { KEYS } from "@/config";
import { NORMALIZE_CTX } from "@/content/catalog";
import { UE, parsePts, saveUebRec, setUebCauseRec, type Cause } from "@/lib/aufgaben";
import type { SessSrc } from "@/lib/lernen";
import { guess, answer as srsAnswer } from "@/lib/srs";
import { today } from "@/lib/dates";
import { blank, isObj, normalize, type State } from "@/lib/state";

/**
 * Laufende Lernrunde – gleiches Format wie UI.sess der Live-App (Schlüssel tap2coach-sess), damit ein Neuladen
 * (und später der Umstieg) die Runde nicht verliert. res: Ergebnis je Frage (ok, Ampel vorher f / nachher t, geraten),
 * last: Hinweis „Vorherige Frage …“, pick: gewählte Option, rev: Antwort aufgedeckt, optOpen: Optionen sichtbar,
 * own: eigene Antwort (Stichpunkte), code: getippte Lösung je Code-Karte, ord: gemischte Reihenfolge der Optionen.
 */
export type SessRes = { ok: boolean; f: number; t: number; guess?: boolean };
export type Session = {
  title: string; ids: string[]; i: number; pick: number | null; rev: boolean; res: Record<string, SessRes>;
  last: { ok: boolean; f: number; t: number; id?: string } | null; src: SessSrc;
  optOpen?: boolean; own?: string; ord?: Record<string, number[]>; code?: Record<string, string>;
  evRes?: unknown; evKap?: boolean;
};

type Store = {
  S: State;
  storeOk: boolean;
  sess: Session | null;
  /** Antwort verbuchen; gibt die Ampel vorher und nachher zurück (wie answer() in der Live-App). */
  answer: (id: string, ok: boolean, unsure?: boolean) => [number, number];
  /** Antwort im Tutor: zählt in die Tagesstatistik (S.log), ohne eine Frage des Katalogs zu ändern. */
  logTutor: () => void;
  /** „War geraten“: höchstens gelb, morgen wieder. */
  markGuess: (id: string) => void;
  toggleMark: (id: string) => void;
  /** Eigene Karte zu einem Thema anlegen (ID „c“ + Zeitstempel wie in der Live-App). */
  addCustom: (tid: string, f: string, b: string) => void;
  /** Eigene Karte löschen – mit Lösch-Ereignis für den Sync, damit sie nicht von einem anderen Gerät zurückkommt. */
  deleteCustom: (tid: string, id: string) => void;
  /** Ganzen Stand ersetzen (Sicherung laden). Der bisherige Stand wird vorher zurückgelegt. */
  replaceAll: (incoming: unknown) => void;
  /** Zusammengeführten Stand aus dem Sync übernehmen (ohne Rücklage, Zusammenführen verliert nichts). */
  applySynced: (S: State) => void;
  /** Lernstand und laufende Runde in diesem Browser löschen (Datenschutz: Recht auf Löschung, lokal). */
  resetAll: () => void;
  /** Runde starten (leere Liste: nichts tun). src.tid merkt sich das Thema für „Als Nächstes“. */
  startSession: (title: string, ids: string[], src?: SessSrc, startAt?: number) => void;
  setSession: (s: Session | null) => void;
  /** Punkte einer Übungsaufgabe speichern (Eingabe wie im Feld; keine Zahl → nichts passiert). */
  saveUeb: (id: string, raw: string) => void;
  /** Fehlerursache einer Übungsaufgabe setzen/entfernen – mit Eintrag im Fehlerprotokoll und Sync-Ereignis. */
  setUebCause: (id: string, c: Cause) => void;
};

const read = <T,>(key: string): T | null => { try { const t = localStorage.getItem(key); return t ? (JSON.parse(t) as T) : null; } catch { return null; } };
const write = (key: string, v: unknown): boolean => { try { if (v == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } };

function loadState(): State {
  const raw = read<unknown>(KEYS.state);
  return raw ? normalize(raw, NORMALIZE_CTX) : blank();
}
/** Gespeicherte Runde prüfen (eigene Daten, aber evtl. aus einer älteren Version): unbrauchbare Teile verwerfen. */
export function cleanSession(s: unknown): Session | null {
  if (!isObj(s) || !Array.isArray(s.ids) || !s.ids.every((x) => typeof x === "string") || !Number.isInteger(s.i) || (s.i as number) < 0 || (s.i as number) >= s.ids.length) return null;
  const res: Record<string, SessRes> = {};
  if (isObj(s.res)) Object.entries(s.res).forEach(([k, v]) => { if (isObj(v) && typeof v.ok === "boolean") res[k] = { ok: v.ok, f: Number(v.f ?? -1), t: Number(v.t ?? -1), ...(v.guess ? { guess: true } : {}) }; });
  return { ...(s as Session), title: String(s.title ?? "Lernrunde"), ids: s.ids as string[], i: s.i as number, pick: typeof s.pick === "number" ? s.pick : null, rev: !!s.rev, res, last: isObj(s.last) ? (s.last as Session["last"]) : null, src: isObj(s.src) ? (s.src as SessSrc) : {} };
}
const loadSession = () => cleanSession(read<unknown>(KEYS.session));

export const useProgress = create<Store>((set, get) => {
  const save = (S: State) => set({ S, storeOk: write(KEYS.state, S) });
  return {
    S: typeof window === "undefined" ? blank() : loadState(),
    storeOk: true,
    sess: typeof window === "undefined" ? null : loadSession(),
    logTutor: () => { const S = get().S, d = today(); save({ ...S, log: { ...S.log, [d]: (S.log[d] || 0) + 1 } }); },
    answer: (id, ok, unsure = false) => {
      const S = get().S, before = S.q[id] ? S.q[id].s : -1, { q, logDay } = srsAnswer(S, id, ok, unsure);
      save({ ...S, q: { ...S.q, [id]: q }, log: logDay ? { ...S.log, [logDay]: (S.log[logDay] || 0) + 1 } : S.log });
      return [before, q.s];
    },
    markGuess: (id) => { const S = get().S; if (S.q[id]) save({ ...S, q: { ...S.q, [id]: guess(S.q[id]) } }); },
    addCustom: (tid, f, b) => { const S = get().S; save({ ...S, custom: { ...S.custom, [tid]: (S.custom[tid] || []).concat([{ id: "c" + Date.now(), f, b }]) } }); },
    deleteCustom: (tid, id) => {
      const S = get().S, q = { ...S.q }, mark = { ...S.mark };
      delete q[id]; delete mark[id];
      void import("./livesync").then((m) => m.recordEv("c", id));
      save({ ...S, q, mark, custom: { ...S.custom, [tid]: (S.custom[tid] || []).filter((x) => x.id !== id) } });
    },
    toggleMark: (id) => {
      const S = get().S, mark = { ...S.mark };
      const on = !mark[id];
      if (on) mark[id] = 1; else delete mark[id];
      save({ ...S, mark });
      void import("./livesync").then((m) => m.recordEv("m", id, on)); // Lösch-Ereignis für den Sync (wie Live-App)
    },
    replaceAll: (incoming) => {
      write(KEYS.beforeImport, { at: Date.now(), data: get().S }); // Rettung per Hand möglich
      save(normalize(incoming, NORMALIZE_CTX));
    },
    applySynced: (S) => save(S),
    resetAll: () => { [KEYS.state, KEYS.session, KEYS.beforeImport].forEach((k) => write(k, null)); set({ S: blank(), sess: null, storeOk: true }); },
    startSession: (title, ids, src = {}, startAt = 0) => {
      if (!ids.length) return;
      if (src.tid) save({ ...get().S, last: src.tid });
      const sess: Session = { title, ids, i: startAt, pick: null, rev: false, res: {}, last: null, src };
      write(KEYS.session, sess); set({ sess });
    },
    setSession: (sess) => { write(KEYS.session, sess); set({ sess }); },
    saveUeb: (id, raw) => {
      const u = UE[id], p = u ? parsePts(raw, u.max) : null;
      if (u && p != null) save(saveUebRec(get().S, id, p));
    },
    setUebCause: (id, c) => {
      const r = setUebCauseRec(get().S, id, c);
      if (!r) return;
      void import("./livesync").then((m) => m.recordEv("e", r.ev[0], r.ev[1])); // wie syncEv("e", …) in logCause()
      save(r.S);
    },
  };
});

// Änderungen aus anderen Tabs übernehmen (gleiches Verhalten wie die Live-App)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEYS.state && e.newValue) { try { useProgress.setState({ S: normalize(JSON.parse(e.newValue), NORMALIZE_CTX) }); } catch { /* fremder Inhalt: ignorieren */ } }
  });
}
