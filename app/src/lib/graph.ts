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

// ======================================================================================================================
// Konzept-Graph (Prüfer-Tutor): eine Ebene tiefer – Konzepte = Kernaussagen der Lernpakete eines Themas (P04.2 …),
// dazu Fehlvorstellungen als eigene Knoten. Beherrschung je Konzept aus Tutor-Belegen plus Fragendaten (Lernrunden).
// ======================================================================================================================

export type ConceptNode = {
  id: string; label: string; paket: string; paketTitel: string;
  /** Beherrschung 0…1, null = noch nichts bekannt */
  m: number | null; level: Level;
  /** Anzahl Tutor-Belege, davon die letzten zur Anzeige */
  n: number; last?: TutorEv;
  /** Vorwissen aus den Lernrunden (Paket bzw. Thema) */
  prior: number | null;
  fv: number;
};
export type MisconNode = { id: string; konzept?: string; text: string; count: number; active: boolean; seen: number };
export type ConceptGraph = { topic: string; concepts: ConceptNode[]; miscon: MisconNode[]; m: number | null; level: Level };
/** Ausschnitt aus dem Tutor-Stand (lib/tutor-state.ts), den der Graph braucht */
export type TutorEv = { id: string; at: number; k?: string; t: string; art: "beleg" | "luecke" | "fehlvorstellung" | "behoben" | "bewertung"; w: number; f?: string; n?: string };
export type TutorView = { ev: TutorEv[]; fv: Record<string, { id: string; k?: string; t: string; text: string; seen: number; fix?: number }> };

/** Konzepte eines Themas: Kernaussagen aller Lernpakete in Katalog-Reihenfolge */
export function conceptsOf(topic: Topic | undefined, pakete: Map<string, Paket>): { id: string; label: string; paket: Paket }[] {
  if (!topic) return [];
  return topic.th.flatMap((pid) => { const p = pakete.get(pid); return p ? p.kern.map((k, i) => ({ id: `${p.id}.${i + 1}`, label: k[0], paket: p })) : []; });
}

/** Wert eines Belegs als „sitzt zu …“ (0…1) */
export function evValue(e: Pick<TutorEv, "art" | "w">): number {
  const w = Math.max(-1, Math.min(1, e.w));
  switch (e.art) {
    case "bewertung": return Math.max(0, Math.min(1, w));
    case "beleg": return 0.6 + 0.4 * Math.max(0, w);
    case "luecke": return 0.4 * (1 + Math.min(0, w)); // -1 → 0, 0 → 0.4
    case "fehlvorstellung": return 0.1;
    case "behoben": return 0.75;
  }
}
const DECAY = 0.8, PRIOR_MAX = 1, PRIOR_CAP = 0.5;
/**
 * Beherrschung eines Konzepts: gewichteter Mittelwert aus Vorwissen und Tutor-Belegen (neuere zählen mehr: Faktor 0,8 je
 * älterem Beleg). Vorwissen aus den Lernrunden ist nur ein schwacher Hinweis: höchstens 50 % und höchstens so viel
 * Gewicht wie ein Beleg – grüne Karten heißen noch nicht, dass man es in der Prüfung erklären kann. Ohne beides: null.
 */
export function mastery(evs: Pick<TutorEv, "art" | "w" | "at" | "id">[], prior: number | null, priorWeight: number): number | null {
  const list = evs.slice().sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  let W = prior != null ? Math.min(PRIOR_MAX, Math.max(0, priorWeight)) : 0, S = prior != null ? W * Math.min(PRIOR_CAP, prior) : 0;
  list.forEach((e, i) => { const k = Math.pow(DECAY, list.length - 1 - i); W += k; S += k * evValue(e); });
  return W > 0 ? S / W : null;
}
/** Einordnung eines Konzepts: offene Fehlvorstellung → schwach; „stark“ erst mit mindestens zwei Tutor-Belegen */
export function conceptLevel(m: number | null, n: number, activeFv: number): Level {
  if (m == null) return "offen";
  if (activeFv > 0 || m < 0.4) return "schwach";
  if (m >= 0.75 && n >= 2) return "stark";
  return "festigen";
}

/** Konzept-Graph eines Themas (rein): Katalog, Lernstand, Fragen und Tutor-Stand werden übergeben */
export function buildConceptGraph(S: State, topic: Topic, pakete: Paket[], questions: Question[], tv: TutorView): ConceptGraph {
  const PK = new Map(pakete.map((p) => [p.id, p])), qs = questions.filter((q) => q.topic === topic.id);
  const topicC = counts(S, qs), topicStarted = topicC.t - topicC.n;
  // Vorwissen je Paket: Karten der Paket-Decks; ohne eigene Karten das ganze Thema (schwächer gewichtet)
  const priorOf = new Map<string, { p: number | null; w: number }>();
  topic.th.forEach((pid) => {
    const p = PK.get(pid); if (!p) return;
    const decks = new Set(p.decks ?? []), pq = qs.filter((q) => q.type === "card" && q.deck && decks.has(q.deck));
    const c = pq.length ? counts(S, pq) : topicC, started = pq.length ? c.t - c.n : topicStarted;
    priorOf.set(pid, started > 0 ? { p: c.pct, w: (pq.length ? 1 : 0.5) * Math.min(PRIOR_MAX, started / 10) } : { p: null, w: 0 });
  });
  const evT = tv.ev.filter((e) => e.t === topic.id);
  const topicEv = evT.filter((e) => !e.k); // Bewertungen ohne Konzept (z. B. aus dem alten Lernpfad) wirken auf alle Konzepte schwach
  const fvs = Object.values(tv.fv).filter((f) => f.t === topic.id);
  const concepts: ConceptNode[] = conceptsOf(topic, PK).map(({ id, label, paket }) => {
    const own = evT.filter((e) => e.k === id), pr = priorOf.get(paket.id) ?? { p: null, w: 0 };
    const activeFv = fvs.filter((f) => f.k === id && (!f.fix || f.seen > f.fix)).length;
    const m = mastery([...own, ...topicEv.slice(-3)], pr.p, pr.w);
    return { id, label, paket: paket.id, paketTitel: paket.titel, m, level: conceptLevel(m, own.length, activeFv), n: own.length, ...(own.length ? { last: own[own.length - 1] } : {}), prior: pr.p, fv: activeFv };
  });
  const miscon: MisconNode[] = fvs.map((f) => ({ id: f.id, ...(f.k ? { konzept: f.k } : {}), text: f.text, count: Math.max(1, evT.filter((e) => e.f === f.id && e.art === "fehlvorstellung").length), active: !f.fix || f.seen > f.fix, seen: f.seen }))
    .sort((a, b) => Number(b.active) - Number(a.active) || b.seen - a.seen);
  const known = concepts.filter((c) => c.m != null);
  const m = known.length ? concepts.reduce((a, c) => a + (c.m ?? 0.2), 0) / concepts.length : null; // offene Konzepte zählen mit 0,2
  // „Sitzt“ nur, wenn der Tutor die meisten Konzepte belegt hat (mind. 60 % der Konzepte „sitzt“)
  const strong = concepts.length > 0 && concepts.filter((c) => c.level === "stark").length / concepts.length >= 0.6;
  const level: Level = m == null ? "offen" : miscon.some((x) => x.active) || m < 0.4 ? "schwach" : strong && m >= 0.75 ? "stark" : "festigen";
  return { topic: topic.id, concepts, miscon, m, level };
}

/** Schwächste Konzepte zuerst (offen vor schwach, dann nach Beherrschung) – Fokus für die nächste Sitzung */
export function weakest(g: ConceptGraph, n: number): ConceptNode[] {
  const rank = (c: ConceptNode) => (c.fv ? -1 : c.m == null ? 0.3 : c.m);
  return g.concepts.slice().sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : 1)).slice(0, n);
}
