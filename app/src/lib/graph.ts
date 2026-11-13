/**
 * Wissensgraph (Premium-Tutor, Stufe 1 – ohne KI).
 *
 * Knoten: Prüfungsteile → Themen → Lernpakete (Theorie-Einheiten aus dem Katalog).
 * Jeder Knoten bekommt einen Beherrschungswert aus dem Lernstand (grün voll, gelb halb – wie die Prüfungsreife)
 * und eine Einordnung: stark / sicher werden / schwach / offen. Dazu Fehlerschwerpunkte (häufig falsche Fragen).
 *
 * Stufe 2 (geplant, siehe docs/TUTOR.md): Der KI-Tutor liest diesen Graphen als Lernermodell, stellt
 * Diagnosefragen zu schwachen Knoten und schreibt belegte Erkenntnisse zurück (wie LearnHarness).
 * Rein und testbar: bekommt Katalog und Lernstand übergeben.
 */
import type { Paket, Question, Topic } from "@/content/schema";
import { counts, st } from "./srs";
import type { State } from "./state";

export type Level = "stark" | "festigen" | "schwach" | "offen";
export type GraphNode = { id: string; label: string; kind: "teil" | "topic" | "paket"; parent?: string; pct: number; level: Level; total: number; red: number; fresh: number; prio?: string };
export type ErrorSpot = { id: string; topic: string; q: string; wrong: number; tries: number };
export type KnowledgeGraph = { nodes: GraphNode[]; strengths: GraphNode[]; weaknesses: GraphNode[]; gaps: GraphNode[]; errors: ErrorSpot[] };

/** Einordnung: „offen“ = kaum begonnen; sonst nach Reife und Fehleranteil. */
export function levelOf(pct: number, started: number, total: number, red: number): Level {
  if (!total || started / total < 0.15) return "offen";
  if (red / Math.max(1, started) >= 0.3 || pct < 0.35) return "schwach";
  if (pct >= 0.75) return "stark";
  return "festigen";
}

const TEILE: [string, string, (t: Topic) => boolean][] = [
  ["teil:t1", "Teil 1", (t) => t.teil !== "SoWi" && t.teil.includes("1")],
  ["teil:t2", "Teil 2", (t) => t.teil !== "SoWi" && t.teil.includes("2")],
  ["teil:wiso", "WiSo", (t) => t.teil === "SoWi"],
];

export function buildGraph(S: State, topics: Topic[], pakete: Paket[], questions: Question[]): KnowledgeGraph {
  const node = (id: string, label: string, kind: GraphNode["kind"], qs: Question[], parent?: string, prio?: string): GraphNode => {
    const c = counts(S, qs), started = c.t - c.n;
    return { id, label, kind, parent, prio, pct: c.pct, total: c.t, red: c.r, fresh: c.n, level: levelOf(c.pct, started, c.t, c.r) };
  };
  const byTopic = new Map<string, Question[]>();
  questions.forEach((q) => { const l = byTopic.get(q.topic) ?? []; l.push(q); byTopic.set(q.topic, l); });
  const PK = new Map(pakete.map((p) => [p.id, p]));
  const nodes: GraphNode[] = [];
  TEILE.forEach(([id, label, inTeil]) => nodes.push(node(id, label, "teil", topics.filter(inTeil).flatMap((t) => byTopic.get(t.id) ?? []))));
  topics.forEach((t) => {
    const qs = byTopic.get(t.id) ?? [];
    const teil = TEILE.find(([, , f]) => f(t))?.[0];
    nodes.push(node(t.id, t.n, "topic", qs, teil, t.prio));
    t.th.forEach((pid) => {
      const p = PK.get(pid); if (!p) return;
      const decks = new Set(p.decks ?? []);
      const pq = qs.filter((q) => q.type === "card" && q.deck && decks.has(q.deck));
      nodes.push(node(`${t.id}/${pid}`, p.titel, "paket", pq.length ? pq : qs, t.id, p.prio)); // ohne eigene Karten: Thema als Näherung
    });
  });
  const topicNodes = nodes.filter((n) => n.kind === "topic");
  const errors = questions
    .map((q) => ({ id: q.id, topic: q.topic, q: q.q, wrong: S.q[q.id]?.w ?? 0, tries: S.q[q.id]?.n ?? 0 }))
    .filter((e) => e.wrong > 0 && st(S, e.id) !== 2)
    .sort((a, b) => b.wrong - a.wrong || b.tries - a.tries)
    .slice(0, 10);
  return {
    nodes,
    strengths: topicNodes.filter((n) => n.level === "stark").sort((a, b) => b.pct - a.pct),
    weaknesses: topicNodes.filter((n) => n.level === "schwach").sort((a, b) => b.red - a.red || a.pct - b.pct),
    gaps: topicNodes.filter((n) => n.level === "offen").sort((a, b) => (a.prio === "Muss" ? 0 : 1) - (b.prio === "Muss" ? 0 : 1)),
    errors,
  };
}
