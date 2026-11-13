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
import { answer as srsAnswer } from "@/lib/srs";
import { blank, normalize, type State } from "@/lib/state";

/** Laufende Lernrunde. Wird gespeichert, damit ein Neuladen die Runde nicht verliert. */
export type Session = { title: string; ids: string[]; i: number; res: Record<string, "ok" | "unsure" | "wrong"> };

type Store = {
  S: State;
  storeOk: boolean;
  sess: Session | null;
  answer: (id: string, ok: boolean, unsure?: boolean) => void;
  toggleMark: (id: string) => void;
  /** Ganzen Stand ersetzen (Sicherung laden). Der bisherige Stand wird vorher zurückgelegt. */
  replaceAll: (incoming: unknown) => void;
  /** Zusammengeführten Stand aus dem Sync übernehmen (ohne Rücklage, Zusammenführen verliert nichts). */
  applySynced: (S: State) => void;
  /** Lernstand und laufende Runde in diesem Browser löschen (Datenschutz: Recht auf Löschung, lokal). */
  resetAll: () => void;
  startSession: (title: string, ids: string[]) => void;
  setSession: (s: Session | null) => void;
};

const read = <T,>(key: string): T | null => { try { const t = localStorage.getItem(key); return t ? (JSON.parse(t) as T) : null; } catch { return null; } };
const write = (key: string, v: unknown): boolean => { try { if (v == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } };

function loadState(): State {
  const raw = read<unknown>(KEYS.state);
  return raw ? normalize(raw, NORMALIZE_CTX) : blank();
}
function loadSession(): Session | null {
  const s = read<Session>(KEYS.session);
  return s && Array.isArray(s.ids) && s.ids.every((x) => typeof x === "string") && Number.isInteger(s.i) && s.i < s.ids.length ? { title: String(s.title ?? "Lernrunde"), ids: s.ids, i: s.i, res: s.res && typeof s.res === "object" ? s.res : {} } : null;
}

export const useProgress = create<Store>((set, get) => {
  const save = (S: State) => set({ S, storeOk: write(KEYS.state, S) });
  return {
    S: typeof window === "undefined" ? blank() : loadState(),
    storeOk: true,
    sess: typeof window === "undefined" ? null : loadSession(),
    answer: (id, ok, unsure = false) => {
      const S = get().S, { q, logDay } = srsAnswer(S, id, ok, unsure);
      const next: State = { ...S, q: { ...S.q, [id]: q }, last: id, log: logDay ? { ...S.log, [logDay]: (S.log[logDay] || 0) + 1 } : S.log };
      save(next);
    },
    toggleMark: (id) => {
      const S = get().S, mark = { ...S.mark };
      if (mark[id]) delete mark[id]; else mark[id] = 1;
      save({ ...S, mark });
    },
    replaceAll: (incoming) => {
      write(KEYS.beforeImport, { at: Date.now(), data: get().S }); // Rettung per Hand möglich
      save(normalize(incoming, NORMALIZE_CTX));
    },
    applySynced: (S) => save(S),
    resetAll: () => { [KEYS.state, KEYS.session, KEYS.beforeImport].forEach((k) => write(k, null)); set({ S: blank(), sess: null, storeOk: true }); },
    startSession: (title, ids) => { const sess = { title, ids, i: 0, res: {} }; write(KEYS.session, sess); set({ sess }); },
    setSession: (sess) => { write(KEYS.session, sess); set({ sess }); },
  };
});

// Änderungen aus anderen Tabs übernehmen (gleiches Verhalten wie die Live-App)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEYS.state && e.newValue) { try { useProgress.setState({ S: normalize(JSON.parse(e.newValue), NORMALIZE_CTX) }); } catch { /* fremder Inhalt: ignorieren */ } }
  });
}
