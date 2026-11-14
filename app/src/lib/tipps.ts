/**
 * Tipps – Regeln wie in rTipps(), errSummaryHTML(), rOperatoren() und rTutorial() der Live-App.
 * Reine Funktionen; Texte der Ansichten stehen in den Routen, Inhalte (Operator-Übungen, -Treppe) im Katalog.
 */
import { BASE_Q, TAP2, TOPICS, allQ, topicQ } from "@/content/catalog";
import type { Question, Topic } from "@/content/schema";
import { CAUSES, isCause, type Cause } from "./aufgaben";
import { shuffle } from "./dates";
import { teilRank } from "./lernen";
import { counts, isDue, st, type Counts } from "./srs";
import type { ErrEntry, State } from "./state";

// ---------- Fehlerprotokoll-Auswertung (errSummaryHTML)
export type ErrSummary = { n: number; tot: number; rows: [Cause, number][] };
/** Verlorene Punkte je Ursache, absteigend. Unbekannte Ursachen (z. B. aus fremden Sicherungen) werden übersprungen, nie gelöscht. */
export function errSummary(errlog: ErrEntry[]): ErrSummary {
  const log = errlog.filter((x) => x && isCause(x.cause));
  const sum: Partial<Record<Cause, number>> = {};
  log.forEach((x) => { const c = x.cause as Cause; sum[c] = (sum[c] || 0) + (x.pts || 0); });
  const tot = Object.values(sum).reduce((a, b) => a + (b ?? 0), 0) || 1;
  return { n: log.length, tot, rows: (Object.entries(sum) as [Cause, number][]).sort((a, b) => b[1] - a[1]) };
}
export { CAUSES };

// ---------- „Hier holst du am meisten raus“
/** Höchstens 5 Themen mit offenen Fragen: Pflichtthemen zuerst, dann geringste Reife, dann Prüfungsteil */
export function weakTopics(S: State): { t: Topic; c: Counts }[] {
  return TOPICS.map((t) => ({ t, c: counts(S, topicQ(S, t.id)) })).filter((x) => x.c.t && x.c.open)
    .sort((a, b) => (a.t.prio === "Muss" ? 0 : 1) - (b.t.prio === "Muss" ? 0 : 1) || a.c.pct - b.c.pct || teilRank(a.t) - teilRank(b.t)).slice(0, 5);
}
/** Lernpaket „Prüfungstechnik“ (PK.X01) */
export const TECHNIK = TAP2.pakete.find((p) => p.id === "X01");

// ---------- Operator-Trainer
export const OPDRILLS = TAP2.operatoren.drills;
export const OP_LADDER = TAP2.operatoren.ladder;
/** Laufendes Training (UI.od): Reihenfolge, Position, gewählte Antwort, Punkte, gemischte Antworten je Übung */
export type Drill = { i: number; pick: number | null; score: number; order: number[]; ord: Record<number, number[]> };
export const startDrill = (): Drill => ({ i: 0, pick: null, score: 0, order: shuffle(OPDRILLS.map((_, k) => k)), ord: {} });
/** Antworten der aktuellen Übung mischen (einmal je Übung, damit die richtige nicht immer an derselben Stelle steht) */
export function drillOrder(d: Drill): Drill {
  const k = d.order[d.i];
  return k === undefined || d.ord[k] ? d : { ...d, ord: { ...d.ord, [k]: shuffle(OPDRILLS[k].opts.map((_, j) => j)) } };
}
export function pickDrill(d: Drill, opt: number): Drill {
  if (d.pick !== null) return d;
  const x = OPDRILLS[d.order[d.i]];
  return { ...d, pick: opt, score: d.score + (opt === x.right ? 1 : 0) };
}
export const nextDrill = (d: Drill): Drill => ({ ...d, i: d.i + 1, pick: null });

// ---------- Tutorial
/** Kennzahlen für „Dein Plan bis …“: offene Arbeit (rot/neu doppelt, gelb einfach), Fragen pro Tag, fällige Fragen */
export function tutStats(S: State, left: number) {
  const all = allQ(S), c = counts(S, all), dueN = all.filter((q) => isDue(S, q.id)).length;
  const need = all.reduce((a, q) => { const s0 = st(S, q.id); return a + (s0 === 2 ? 0 : s0 === 1 ? 1 : 2); }, 0);
  return { c, dueN, need, perDay: need ? Math.ceil(need / Math.max(1, left - 1)) : 0 };
}
/** „Code-Karte üben“: erste Code-Karte, die noch nicht grün ist, sonst die erste */
export function codeCard(S: State): Question | undefined {
  const ids = Object.keys(TAP2.codeLang), id = ids.find((x) => st(S, x) !== 2) || ids[0];
  return BASE_Q.find((q) => q.id === id);
}
export const KEY_TUT = "tap2coach-tut";
