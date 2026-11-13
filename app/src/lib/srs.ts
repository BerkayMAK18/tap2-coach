/**
 * Wiederholungs-Engine (Leitner), 1:1 wie in der Live-App.
 *
 * Box 0 = falsch → heute noch einmal · Box 1 = gelb → morgen · ab Box 2 = grün → 3, 7, 14, 30 Tage.
 * „Unsicher richtig“ setzt auf Box 1, falsch auf Box 0. Grün ab Box 2.
 * Alle Funktionen sind rein (bekommen den Lernstand übergeben) und in srs.test.ts getestet.
 */
import { addDays, daysBetween, shuffle, today } from "./dates";
import type { QRec, State } from "./state";
import type { Question } from "@/content/schema";

export const IV = [0, 1, 3, 7, 14, 30];

export const st = (S: State, id: string) => (S.q[id] ? S.q[id].s : -1);
export const isDue = (S: State, id: string) => { const r = S.q[id]; return !!(r && r.d && r.d <= today()); };

/** Antwort verbuchen. Gibt den neuen Lernstand der Frage zurück (unveränderlich: S wird nicht verändert). */
export function answer(S: State, id: string, ok: boolean, unsure = false): { q: QRec; logDay: string | null } {
  const prev = S.q[id], r: QRec = prev ? { ...prev } : { s: -1, n: 0, w: 0, b: 0 };
  r.n = (r.n || 0) + 1;
  if (r.b == null) r.b = r.s >= 2 ? 2 : r.s === 1 ? 1 : 0;
  if (ok) r.b = unsure ? 1 : Math.min(r.b + 1, IV.length - 1); else { r.b = 0; r.w = (r.w || 0) + 1; }
  r.s = ok ? (r.b >= 2 ? 2 : 1) : 0;
  r.d = addDays(today(), IV[r.b]);
  r.t = Date.now();
  return { q: r, logDay: id.startsWith("ev:") ? null : today() }; // Events zählen nicht zur Lernstatistik
}

/** „War geraten“: Auswahlfrage richtig, aber geraten → morgen wieder, höchstens gelb (markGuess in der Live-App). */
export const guess = (r: QRec): QRec => ({ ...r, b: 1, s: 1, d: addDays(today(), IV[1]), t: Date.now() });
/** Tage bis zur nächsten Wiederholung (null = noch nie beantwortet). */
export const dueIn = (S: State, id: string) => { const r = S.q[id]; return r && r.d ? daysBetween(today(), r.d) : null; };
/** „heute noch einmal“, „wieder morgen“, „wieder in 3 Tagen“ */
export const nextTxt = (S: State, id: string) => { const d = dueIn(S, id); return d == null ? "" : d <= 0 ? "heute noch einmal" : d === 1 ? "wieder morgen" : `wieder in ${d} Tagen`; };

export type Counts = { g: number; y: number; r: number; n: number; t: number; pct: number; open: number };
export function counts(S: State, list: Pick<Question, "id">[]): Counts {
  const c = { g: 0, y: 0, r: 0, n: 0, t: list.length, pct: 0, open: 0 };
  list.forEach((q) => { const s = st(S, q.id); if (s === 2) c.g++; else if (s === 1) c.y++; else if (s === 0) c.r++; else c.n++; });
  c.pct = c.t ? (c.g + c.y * 0.5) / c.t : 0;
  c.open = c.t - c.g;
  return c;
}

/** Priorität in einer Runde: rot vor fällig vor neu vor gelb vor grün. */
export const prio = (S: State, id: string) => { const s = st(S, id); if (s === -1) return 2; if (s === 0) return 0; if (isDue(S, id)) return 1; return s === 1 ? 3 : 4; };
const dueKey = (S: State, id: string) => (S.q[id] && S.q[id].d) || "9999";
export function smartOrder<T extends { id: string }>(S: State, list: T[]): T[] {
  return shuffle(list.slice()).sort((a, b) => prio(S, a.id) - prio(S, b.id) || (prio(S, a.id) === 1 ? (dueKey(S, a.id) < dueKey(S, b.id) ? -1 : dueKey(S, a.id) > dueKey(S, b.id) ? 1 : 0) : 0));
}
export const dueList = <T extends { id: string }>(S: State, list: T[]) => smartOrder(S, list.filter((q) => isDue(S, q.id)));
/** Lernrunde: nur offene (rot, neu, gelb) und fällige Fragen. Sitzt schon alles, wird freiwillig wiederholt. */
export function openOrder<T extends { id: string }>(S: State, list: T[]): T[] { const o = smartOrder(S, list), open = o.filter((q) => prio(S, q.id) < 4); return open.length ? open : o; }
export const reifeLabel = (p: number) => (p >= 0.9 ? "Prüfungsreif" : p >= 0.7 ? "Fast prüfungsreif" : p >= 0.4 ? "Auf dem Weg" : p > 0 ? "Am Anfang" : "Noch nicht gestartet");

export const ROUND = 20;
/**
 * Gemischt üben (wie Live-App): Ist die Runde voll (mehr als 16 eigene offene Fragen), ersetzen bis zu 4 offene Fragen
 * aus anderen, schon bearbeiteten Themen die letzten Plätze. Kleinere Runden bleiben genau so groß, wie Fragen offen sind.
 */
export function mixIn<T extends { id: string; topic: string }>(S: State, base: T[], all: T[], excludeTopics: string[]): T[] {
  const pool = smartOrder(S, all.filter((q) => !excludeTopics.includes(q.topic) && st(S, q.id) >= 0 && prio(S, q.id) < 4));
  const size = Math.min(ROUND, base.length), k = Math.min(4, pool.length, Math.max(0, base.length - (ROUND - 4)));
  const out = base.slice(0, size - k), extra = pool.slice(0, k);
  extra.forEach((q, i) => out.splice(Math.min(out.length, Math.round(((i + 1) * (out.length + extra.length)) / (extra.length + 1))), 0, q));
  return out;
}
