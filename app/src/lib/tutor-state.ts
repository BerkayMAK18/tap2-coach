/**
 * Tutor-Stand (Premium): Belege, Fehlvorstellungen, Sitzungen und Tutor-XP je Tag – auf allen Geräten gleich.
 *
 * Gespeichert lokal (tap2coach-tutor-stand) und Ende-zu-Ende-verschlüsselt in app_tutor_state (store/tutor-sync.ts).
 * Bewusst NICHT im Paket tap2_sync: Die Live-App schreibt dieses Paket neu und würde fremde Teile verwerfen.
 *
 * Alles Abgeleitete (Beherrschung je Konzept, Lehrplan, Anzahl je Fehlvorstellung) wird aus diesen Daten berechnet und
 * nie gespeichert – so gibt es nichts, was zwischen Geräten auseinanderlaufen kann.
 *
 * Merge-Regel (mergeTutor) – kommutativ, assoziativ, idempotent (getestet in tutor-state.test.ts):
 * - Belege (ev): Vereinigung über die ID; gleiche ID mit verschiedenem Inhalt → feste Regel (größerer stab-Text).
 *   Sortiert nach (Zeit, ID), es bleiben die jüngsten MAX_EV.
 * - Fehlvorstellungen (fv): Vereinigung über die ID; Text/Konzept vom zuletzt gesehenen Eintrag (Gleichstand: feste Regel),
 *   first = frühester, seen = spätester Zeitpunkt, fix = spätester „behoben“-Zeitpunkt. Aktiv, solange seen > fix.
 * - Sitzungen (sess): Vereinigung über die ID; Zähler je Sitzung als Maximum (eine Sitzung läuft auf einem Gerät).
 * - Tutor-XP je Tag (xp): je Tag und Gerät das Maximum, Summe über Geräte = XP des Tages (Anzeige).
 *   Tage älter als XP_DAYS fallen weg.
 * - Zurücksetzen (reset): Zeitpunkt, je Gerät das Maximum. Belege, Fehlvorstellungen und Sitzungen vor dem Zeitpunkt
 *   fallen auf allen Geräten weg – ein Zurücksetzen kommt so auch bei Geräten an, die noch alte Daten haben.
 *   EPOCH: fester Stichtag (Neustart des Tutor-Wissens am 14.11.2026), gilt wie ein Zurücksetzen.
 * Daten aus der Cloud oder älteren Ständen gehen immer durch normalizeTutor() (Zod, Längen, nur bekannte IDs).
 */
import { z } from "zod";
import { stab } from "./gami/state";

export const MAX_EV = 800, MAX_FV = 120, MAX_SESS = 120, XP_DAYS = 14;
/** Neustart des Tutor-Wissens (auf Wunsch zurückgesetzt): alles davor zählt nicht mehr */
export const EPOCH = Date.parse("2026-11-14T19:25:00+01:00");

/** Beleg: eine Beobachtung zu einem Konzept (Graph-Update des Tutors oder Bewertung einer Aufgabe) */
export type Ev = {
  id: string; at: number; k?: string; t: string;
  art: "beleg" | "luecke" | "fehlvorstellung" | "behoben" | "bewertung";
  /** Mastery-Änderung (-1…1) bzw. Anteil der Punkte (0…1) bei „bewertung“ */
  w: number;
  p?: number; m?: number; sich?: number; n?: string; f?: string; s?: string;
};
export type Fv = { id: string; k?: string; t: string; text: string; first: number; seen: number; fix?: number };
export type Sess = { id: string; t: string; start: number; end?: number; aufgaben: number; punkte: number; max: number; xp: number; model?: "haiku" | "sonnet" | "bruecke" };
export type TutorState = { v: 2; ev: Ev[]; fv: Record<string, Fv>; sess: Record<string, Sess>; xp: Record<string, Record<string, number>>; reset?: number };
export const emptyTutor = (): TutorState => ({ v: 2, ev: [], fv: {}, sess: {}, xp: {} });
/** Ab wann Daten zählen (Stichtag oder letztes Zurücksetzen) */
export const cutoff = (s: Pick<TutorState, "reset">) => Math.max(EPOCH, s.reset ?? 0);

// ---------- Prüfen (Fremddaten)
const id = z.string().regex(/^[A-Za-z0-9_.:-]{1,64}$/);
const ts = z.number().int().min(0).max(4102444800000); // bis 2100
const EvZ = z.object({
  id, at: ts, k: z.string().max(12).optional(), t: z.string().max(10),
  art: z.enum(["beleg", "luecke", "fehlvorstellung", "behoben", "bewertung"]),
  w: z.number().min(-1).max(1), p: z.number().min(0).max(25).optional(), m: z.number().min(0).max(25).optional(),
  sich: z.number().int().min(0).max(3).optional(), n: z.string().max(300).optional(), f: id.optional(), s: id.optional(),
});
const FvZ = z.object({ id, k: z.string().max(12).optional(), t: z.string().max(10), text: z.string().min(1).max(300), first: ts, seen: ts, fix: ts.optional() });
const SessZ = z.object({ id, t: z.string().max(10), start: ts, end: ts.optional(), aufgaben: z.number().int().min(0).max(500), punkte: z.number().min(0).max(5000), max: z.number().min(0).max(5000), xp: z.number().int().min(0).max(100000), model: z.enum(["haiku", "sonnet", "bruecke"]).optional() });
const day = /^\d{4}-\d{2}-\d{2}$/, dev = /^[A-Za-z0-9_-]{4,40}$/;
export type Known = { topics: Set<string>; kern: Set<string> };

/** Unbekanntes (Cloud, Speicher, alte Version) → gültiger Stand. Ungültige Einträge fallen einzeln weg, nie alles. */
export function normalizeTutor(raw: unknown, known: Known): TutorState {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}, out = emptyTutor();
  const okK = (k?: string) => !k || known.kern.has(k);
  if (Array.isArray(o.ev)) o.ev.slice(-MAX_EV * 2).forEach((e) => { const r = EvZ.safeParse(e); if (r.success && known.topics.has(r.data.t) && okK(r.data.k)) out.ev.push(r.data); });
  if (o.fv && typeof o.fv === "object") Object.values(o.fv).forEach((f) => { const r = FvZ.safeParse(f); if (r.success && known.topics.has(r.data.t) && okK(r.data.k)) out.fv[r.data.id] = r.data; });
  if (o.sess && typeof o.sess === "object") Object.values(o.sess).forEach((s) => { const r = SessZ.safeParse(s); if (r.success && known.topics.has(r.data.t)) out.sess[r.data.id] = r.data; });
  if (ts.safeParse(o.reset).success && (o.reset as number) > 0) out.reset = o.reset as number;
  if (o.xp && typeof o.xp === "object") Object.entries(o.xp as Record<string, unknown>).forEach(([d, m]) => {
    if (!day.test(d) || !m || typeof m !== "object") return;
    Object.entries(m as Record<string, unknown>).forEach(([g, n]) => { if (dev.test(g) && Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 100000) (out.xp[d] ??= {})[g] = n as number; });
  });
  return tidy(out);
}

// ---------- Zusammenführen
const later = <T,>(a: T, b: T) => (stab(a) >= stab(b) ? a : b);
const evOrder = (a: Ev, b: Ev) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/** Feste Größen und Reihenfolge – Ergebnis hängt nur vom Inhalt ab, nicht von der Reihenfolge des Zusammenführens */
function tidy(s: TutorState, todayStr?: string): TutorState {
  const cut = cutoff(s);
  s.ev = s.ev.filter((e) => e.at >= cut);
  s.fv = Object.fromEntries(Object.entries(s.fv).filter(([, f]) => f.seen >= cut));
  s.sess = Object.fromEntries(Object.entries(s.sess).filter(([, x]) => x.start >= cut));
  if (!s.reset) delete s.reset;
  s.ev.sort(evOrder); if (s.ev.length > MAX_EV) s.ev = s.ev.slice(-MAX_EV);
  const fv = Object.values(s.fv).sort((a, b) => b.seen - a.seen || (a.id < b.id ? -1 : 1)).slice(0, MAX_FV);
  s.fv = Object.fromEntries(fv.sort((a, b) => (a.id < b.id ? -1 : 1)).map((f) => [f.id, f]));
  const ss = Object.values(s.sess).sort((a, b) => b.start - a.start || (a.id < b.id ? -1 : 1)).slice(0, MAX_SESS);
  s.sess = Object.fromEntries(ss.sort((a, b) => (a.id < b.id ? -1 : 1)).map((x) => [x.id, x]));
  const days = Object.keys(s.xp).sort().reverse().slice(0, XP_DAYS);
  if (todayStr) days.splice(0, days.length, ...days.filter((d) => d <= todayStr)); // Tage aus der Zukunft (falsche Uhr) zählen nicht
  s.xp = Object.fromEntries(days.sort().map((d) => [d, Object.fromEntries(Object.keys(s.xp[d]).sort().map((g) => [g, s.xp[d][g]]))]));
  return s;
}

export function mergeTutor(a: TutorState, b: TutorState): TutorState {
  const ev = new Map<string, Ev>();
  [...a.ev, ...b.ev].forEach((e) => { const m = ev.get(e.id); ev.set(e.id, m ? later(m, e) : e); });
  const fv: Record<string, Fv> = { ...a.fv };
  Object.values(b.fv).forEach((f) => {
    const m = fv[f.id]; if (!m) { fv[f.id] = f; return; }
    const top = f.seen > m.seen ? f : m.seen > f.seen ? m : later(m, f);
    const fix = Math.max(m.fix ?? 0, f.fix ?? 0);
    fv[f.id] = { id: f.id, t: top.t, text: top.text, ...(top.k ? { k: top.k } : {}), first: Math.min(m.first, f.first), seen: Math.max(m.seen, f.seen), ...(fix ? { fix } : {}) };
  });
  const sess: Record<string, Sess> = { ...a.sess };
  Object.values(b.sess).forEach((x) => {
    const m = sess[x.id]; if (!m) { sess[x.id] = x; return; }
    const base = later(m, x), end = Math.max(m.end ?? 0, x.end ?? 0);
    sess[x.id] = { ...base, start: Math.min(m.start, x.start), aufgaben: Math.max(m.aufgaben, x.aufgaben), punkte: Math.max(m.punkte, x.punkte), max: Math.max(m.max, x.max), xp: Math.max(m.xp, x.xp), ...(end ? { end } : {}) };
    if (!end) delete sess[x.id].end;
  });
  const xp: TutorState["xp"] = {};
  [a.xp, b.xp].forEach((src) => Object.entries(src).forEach(([d, m]) => Object.entries(m).forEach(([g, n]) => { const t = (xp[d] ??= {}); t[g] = Math.max(t[g] ?? 0, n); })));
  const reset = Math.max(a.reset ?? 0, b.reset ?? 0);
  return tidy({ v: 2, ev: [...ev.values()], fv, sess, xp, ...(reset ? { reset } : {}) });
}
/** Tutor-Stand zurücksetzen (alle Geräte): Zeitpunkt setzen, XP-Anzeige bleibt */
export const resetTutor = (s: TutorState, now: number): TutorState => tidy({ ...s, reset: Math.max(s.reset ?? 0, now) });

// ---------- Abfragen und Änderungen (rein)
/** Tutor-XP heute (alle Geräte) – nur zur Anzeige, keine Obergrenze */
export const xpToday = (s: TutorState, d: string) => Object.values(s.xp[d] ?? {}).reduce((a, n) => a + n, 0);
export function addXpDay(s: TutorState, d: string, device: string, n: number): TutorState {
  if (n <= 0) return s;
  const m = { ...(s.xp[d] ?? {}) }; m[device] = (m[device] ?? 0) + n;
  return tidy({ ...s, xp: { ...s.xp, [d]: m } }, d);
}
/** Fehlvorstellung ist offen, solange sie nach dem letzten „behoben“ noch einmal auftrat */
export const fvActive = (f: Fv) => !f.fix || f.seen > f.fix;
/** Wie oft eine Fehlvorstellung belegt ist (aus den Belegen abgeleitet – verträgt jedes Zusammenführen) */
export const fvCount = (s: TutorState, fid: string) => s.ev.filter((e) => e.f === fid && e.art === "fehlvorstellung").length;

/** Belege hinzufügen – schon vorhandene IDs (z. B. derselbe Ergebnis-Block zweimal eingefügt) zählen nicht doppelt */
export function addEvidence(s: TutorState, all: Ev[]): TutorState {
  const have = new Set(s.ev.map((e) => e.id)), list = all.filter((e) => !have.has(e.id) && (have.add(e.id), true));
  if (!list.length) return s;
  const fv = { ...s.fv };
  list.forEach((e) => {
    if (!e.f) return;
    const m = fv[e.f];
    if (e.art === "fehlvorstellung") fv[e.f] = m ? { ...m, seen: Math.max(m.seen, e.at), text: e.n || m.text, ...(e.k ? { k: e.k } : {}) } : { id: e.f, t: e.t, text: e.n || "Fehlvorstellung", first: e.at, seen: e.at, ...(e.k ? { k: e.k } : {}) };
    else if (e.art === "behoben" && m) fv[e.f] = { ...m, fix: Math.max(m.fix ?? 0, e.at) };
  });
  return tidy({ ...s, ev: [...s.ev, ...list], fv });
}
export function putSession(s: TutorState, x: Sess): TutorState { return tidy({ ...s, sess: { ...s.sess, [x.id]: x } }); }
