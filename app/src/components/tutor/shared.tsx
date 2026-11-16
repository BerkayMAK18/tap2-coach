/**
 * Prüfer-Tutor: gemeinsame Bausteine der Ansicht – Einordnung → Farben aus main.css, Konzept-Graphen und Lehrplan aus dem
 * Lernstand und dem Tutor-Stand (rein berechnet, nichts davon kommt von der KI).
 */
import { useMemo } from "react";
import { TAP2, TOPICS, TP, allQ } from "@/content/catalog";
import { EXAM_DAY } from "@/config";
import { daysBetween, fmtDay, iso, today } from "@/lib/dates";
import { buildConceptGraph, type ConceptGraph, type Level } from "@/lib/graph";
import { buildLehrplan, type Lehrplan } from "@/lib/lehrplan";
import { handoff } from "@/lib/tutor-session";
import { fvActive, fvCount, type TutorState } from "@/lib/tutor-state";
import { kbDetail, paketeOf } from "@/lib/tutor-kb";
import type { State } from "@/lib/state";
import { st } from "@/lib/srs";
import { useProgress } from "@/store/progress";
import { KB, useTutor } from "@/store/tutor";

export const LV: Record<Level, { label: string; chip: string; fill: string }> = {
  stark: { label: "Sitzt", chip: "ok", fill: "var(--ok)" },
  festigen: { label: "Festigen", chip: "yellow", fill: "var(--yellow)" },
  schwach: { label: "Schwach", chip: "red", fill: "var(--bad)" },
  offen: { label: "Offen", chip: "", fill: "var(--line-2)" },
};
export const tn = (id: string) => TP[id]?.n ?? id;
export const pc = (m: number | null) => (m == null ? "–" : Math.round(m * 100) + " %");
export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
export const kernLabel = (k: string) => { const [p, i] = k.split("."); return KB.pakete.get(p)?.kern[Number(i) - 1]?.[0] ?? k; };

/** Konzept-Graph je Thema */
export function graphsOf(S: State, state: TutorState): Map<string, ConceptGraph> {
  const qs = allQ(S);
  return new Map(TOPICS.map((t) => [t.id, buildConceptGraph(S, t, TAP2.pakete, qs, state)]));
}
export function useGraphs() {
  const S = useProgress((s) => s.S), state = useTutor((s) => s.state);
  return useMemo(() => graphsOf(S, state), [S, state]);
}
/** Lehrplan aus Graph, Prüfungsdatum, Muss-Themen und Fehlvorstellungen (passt sich nach jeder Sitzung an) */
export function useLehrplan(): Lehrplan {
  const graphs = useGraphs(), state = useTutor((s) => s.state);
  return useMemo(() => {
    const last = new Map<string, number>();
    Object.values(state.sess).forEach((x) => last.set(x.t, Math.max(last.get(x.t) ?? 0, x.end ?? x.start)));
    return buildLehrplan(TOPICS.map((t) => ({ id: t.id, name: t.n, muss: t.prio === "Muss", g: graphs.get(t.id)!, ...(last.has(t.id) ? { lastSession: last.get(t.id)! } : {}) })), today(), EXAM_DAY, Date.now());
  }, [graphs, state]);
}

/** Übergabe für eine neue Sitzung zu einem Thema */
export function makeHandoff(tid: string, S: State, state: TutorState, g: ConceptGraph, fokus: string[]): string {
  const t = TP[tid], sess = Object.values(state.sess).filter((x) => x.t === tid).sort((a, b) => b.start - a.start);
  const errors = allQ(S).filter((q) => q.topic === tid && (S.q[q.id]?.w ?? 0) > 0 && st(S, q.id) !== 2).sort((a, b) => (S.q[b.id]?.w ?? 0) - (S.q[a.id]?.w ?? 0)).slice(0, 5).map((q) => q.q);
  const lastTxt = (c: ConceptGraph["concepts"][number]) => (c.last ? `${c.last.art}${c.last.n ? " – " + c.last.n : ""}`.slice(0, 120) : undefined);
  return handoff({
    date: fmtDay(today()), examDays: Math.max(0, daysBetween(today(), EXAM_DAY)),
    topic: { id: tid, name: t?.n ?? tid, muss: t?.prio === "Muss" },
    concepts: g.concepts.map((c) => ({ id: c.id, label: c.label, m: c.m, n: c.n, ...(lastTxt(c) ? { last: lastTxt(c) } : {}) })),
    miscon: Object.values(state.fv).filter((f) => f.t === tid && fvActive(f)).map((f) => ({ id: f.id, ...(f.k ? { konzept: f.k } : {}), text: f.text, count: Math.max(1, fvCount(state, f.id)) })),
    errors, sessions: { n: sess.length, ...(sess[0] ? { last: fmtDay(iso(new Date(sess[0].start))) + ` · ${fmt(sess[0].punkte)}/${fmt(sess[0].max)} P.` } : {}) },
    fokus, inhalte: kbDetail(KB, paketeOf(KB, tid)),
  });
}
