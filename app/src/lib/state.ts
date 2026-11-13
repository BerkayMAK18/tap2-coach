/**
 * Lernstand: Datenmodell, Migration und Absicherung von Fremddaten.
 *
 * Das Format ist bewusst IDENTISCH mit der Live-App (index.html, Version 7), damit
 *   - Sicherungsdateien der Live-App hier 1:1 geladen werden können,
 *   - die Apps später denselben Sync nutzen können,
 *   - die neue App die alte ohne Datenverlust ersetzen kann.
 * Änderungen am Format nur gleichzeitig mit einer Migration in normalize() und einem Test.
 *
 * Sicherheit (Security-Check 13.11.2026, siehe Live-App v2.7.4): Alles, was von außen kommt, läuft durch
 * normalize() bzw. die clean*-Funktionen. Regel: echte Daten nie verwerfen, nur Typen erzwingen.
 */
import { addDays, today } from "./dates";

/** Lernstand einer Frage. s: -1 neu, 0 rot, 1 gelb, 2 grün · b: Leitner-Box · d: fällig am · t: zuletzt beantwortet (ms) · n: Versuche · w: falsch */
export type QRec = { s: number; b?: number; d?: string; t?: number; n?: number; w?: number };
export type UebRec = { p: number; at: string; n?: number; cause?: string };
export type Run = { mode: string; teil: string; pct: number; note: number; at: string; ts?: number; detail?: string };
export type ErrEntry = { at: string; src: unknown; ref: unknown; pts: number; cause: string };
export type CustomCard = { id: string; f: string; b: string };
export type State = {
  v: 7;
  q: Record<string, QRec>;
  mark: Record<string, 1>;
  custom: Record<string, CustomCard[]>;
  ueb: Record<string, UebRec>;
  runs: Run[];
  log: Record<string, number>;
  last: string | null;
  errlog: ErrEntry[];
};

export const blank = (): State => ({ v: 7, q: {}, mark: {}, custom: {}, ueb: {}, runs: [], log: {}, last: null, errlog: [] });

// ---------- kleine Prüf-Helfer
type Obj = Record<string, unknown>;
export const isObj = (o: unknown): o is Obj => !!o && typeof o === "object" && !Array.isArray(o);
export const num = (v: unknown, d = 0) => (v != null && v !== "" && Number.isFinite(+(v as number)) ? +(v as number) : d);
export const dayStr = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
/** „erledigt am“ liegt nie in der Zukunft (sonst gewänne es jeden Abgleich für immer). */
export const pastDay = (v: unknown) => { const d = dayStr(v); return d && d > today() ? today() : d; };
const safeTok = (v: unknown) => v == null || (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && v.length <= 300);
/** Kopie ohne gefährliche Schlüssel (__proto__ & Co.). */
export const plain = (o: unknown): Obj => { const out: Obj = {}; if (isObj(o)) Object.keys(o).forEach((k) => { if (k !== "__proto__" && k !== "constructor" && k !== "prototype") out[k] = o[k]; }); return out; };
export const mapObj = <T>(o: unknown, f: (v: unknown, k: string) => T | null): Record<string, T> => { const out: Record<string, T> = {}; Object.entries(plain(o)).forEach(([k, v]) => { const r = f(v, k); if (r != null) out[k] = r; }); return out; };
export const arr = (a: unknown): unknown[] => (Array.isArray(a) ? a : []);
export const note = (p: number) => (p >= 92 ? 1 : p >= 81 ? 2 : p >= 67 ? 3 : p >= 50 ? 4 : p >= 30 ? 5 : 6);

export function cleanQ(r: unknown): QRec | null {
  if (!isObj(r)) return null;
  const x = plain(r);
  (["b", "s", "n", "w"] as const).forEach((k) => { if (k in x) x[k] = num(x[k]); });
  if ("t" in x) x.t = Math.min(num(x.t), Date.now());
  if ("d" in x) x.d = dayStr(x.d) || today();
  return x as QRec;
}
export function cleanUeb(r: unknown): UebRec | null {
  if (!isObj(r)) return null;
  const x = plain(r);
  x.p = num(x.p); x.at = pastDay(x.at); if ("n" in x) x.n = num(x.n, 1);
  if ("cause" in x && !(typeof x.cause === "string" && /^[a-z]{1,20}$/.test(x.cause))) delete x.cause;
  return x as UebRec;
}
export function cleanRun(r: unknown): Run | null {
  if (!isObj(r) || typeof r.mode !== "string" || !/^[a-z]{1,12}$/.test(r.mode) || typeof r.teil !== "string" || !/^[a-z0-9]{1,8}$/.test(r.teil)) return null;
  const pct = Math.max(0, Math.min(100, num(r.pct)));
  const x: Run = { mode: r.mode, teil: r.teil, pct, note: Math.max(1, Math.min(6, Math.round(num(r.note, note(pct))))), at: pastDay(r.at) };
  if (r.ts != null) x.ts = Math.min(num(r.ts), Date.now());
  if (typeof r.detail === "string" && /^[0-9.,/ P]{1,40}$/.test(r.detail)) x.detail = r.detail;
  return x;
}
export function cleanErr(r: unknown): ErrEntry | null {
  if (!isObj(r) || !safeTok(r.src) || !safeTok(r.ref)) return null;
  return { at: pastDay(r.at), src: r.src, ref: r.ref, pts: num(r.pts), cause: typeof r.cause === "string" && /^[a-z]{1,20}$/.test(r.cause) ? r.cause : "" };
}
export function cleanCustom(c: unknown, knownTopics: Set<string>): Record<string, CustomCard[]> {
  const out: Record<string, CustomCard[]> = {};
  Object.entries(plain(c)).forEach(([t, l]) => {
    const topic = knownTopics.has(t) ? t : "T01"; // unbekanntes Thema (nur aus fremden Daten) → nicht verwerfen, unter T01 einsortieren
    arr(l).forEach((it) => {
      if (!isObj(it) || typeof it.id !== "string" || !/^[A-Za-z0-9:_-]{1,60}$/.test(it.id)) return;
      (out[topic] = out[topic] || []).push({ ...(plain(it) as CustomCard), f: String(it.f ?? ""), b: String(it.b ?? "") });
    });
  });
  return out;
}
export const cleanLog = (o: unknown) => mapObj(o, (v, k) => (dayStr(k) ? Math.max(0, num(v)) : null));

/**
 * Bringt jeden Lernstand (eigener, importierter, synchronisierter, aus älteren Versionen) in das aktuelle Format.
 * @param deckTopic Zuordnung Deck → Thema (für Sicherungen vor Version 6)
 */
export function normalize(o: unknown, ctx: { knownTopics: Set<string>; deckTopic: Record<string, string> }): State {
  const src = plain(o);
  const x = Object.assign(blank(), src) as State & Obj;
  const v = num(src.v);
  if (!v || v < 6) { // vor v6: Ampel aus qstat ableiten, eigene Karten von Decks auf Themen umhängen
    const q: Record<string, QRec> = {};
    Object.entries(plain(src.qstat)).forEach(([id, s0]) => { const s = plain(s0); const r = num(s.r), w = num(s.w); q[id] = { s: w === 0 ? (r >= 2 ? 2 : 1) : r > w ? 1 : 0, n: r + w, w }; });
    const c: Obj = {};
    Object.entries(plain(src.custom)).forEach(([deck, l]) => { const t = ctx.deckTopic[deck] || "T01"; c[t] = arr(c[t]).concat(arr(l)); });
    x.q = q; x.custom = c as State["custom"]; x.mark = {}; x.log = {};
  }
  ["cards", "plan", "exams", "quiz", "taken", "goals", "qstat", "xp", "days", "goal", "goalHit", "badges", "aw", "st", "bestStreak", "board"].forEach((k) => delete x[k]);
  if (!v || v < 7) { // v7: Wiederholungsintervalle. Box aus der Ampel ableiten, grüne Fragen auf die nächsten Tage verteilen
    const t0 = today();
    Object.entries(plain(x.q)).forEach(([id, r0]) => {
      const r = r0 as QRec;
      if (!r || r.b != null) return;
      r.b = r.s >= 2 ? 2 : r.s === 1 ? 1 : 0;
      let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
      r.d = r.s >= 2 ? addDays(t0, 1 + (h % 3)) : t0;
    });
  }
  x.q = mapObj(x.q, cleanQ); x.mark = mapObj(x.mark, (v1) => (v1 ? 1 : null)) as Record<string, 1>; x.ueb = mapObj(x.ueb, cleanUeb);
  x.runs = arr(x.runs).map(cleanRun).filter(Boolean) as Run[]; x.errlog = arr(x.errlog).map(cleanErr).filter(Boolean) as ErrEntry[];
  x.custom = cleanCustom(x.custom, ctx.knownTopics); x.log = cleanLog(x.log);
  x.last = typeof x.last === "string" ? x.last : null;
  x.v = 7;
  return x as State;
}
