/** Wissensgraph: Einordnung der Themen und Fehlerschwerpunkte. */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { buildConceptGraph, buildGraph, conceptLevel, conceptsOf, levelOf, mastery, weakest, type TutorView } from "./graph";
import { blank } from "./state";
import type { Question, Topic } from "@/content/schema";

const topics: Topic[] = [
  { id: "T01", n: "Algorithmen", teil: "Teil 2", prio: "Muss", th: [], decks: ["algo"], cats: [] },
  { id: "T02", n: "SQL", teil: "Teil 2", prio: "Muss", th: [], decks: ["sql"], cats: [] },
  { id: "T03", n: "Recht", teil: "SoWi", th: [], decks: [], cats: [] },
];
const q = (id: string, topic: string): Question => ({ id, type: "mc", topic, q: id, opts: ["a", "b"], right: 0, why: "" });
const qs = [q("a1", "T01"), q("a2", "T01"), q("s1", "T02"), q("s2", "T02"), q("r1", "T03")];

describe("Wissensgraph", () => {
  it("ordnet Themen nach Beherrschung ein", () => {
    const S = blank();
    S.q.a1 = { s: 2, n: 2, w: 0 }; S.q.a2 = { s: 2, n: 3, w: 0 };
    S.q.s1 = { s: 0, n: 3, w: 3 }; S.q.s2 = { s: 0, n: 1, w: 1 };
    const g = buildGraph(S, topics, [], qs);
    expect(g.strengths.map((n) => n.id)).toEqual(["T01"]);
    expect(g.weaknesses.map((n) => n.id)).toEqual(["T02"]);
    expect(g.gaps.map((n) => n.id)).toEqual(["T03"]);
    expect(g.errors[0]).toMatchObject({ id: "s1", wrong: 3 });
    expect(g.nodes.find((n) => n.id === "teil:t2")?.total).toBe(4);
  });
  it("grüne Fragen zählen nicht als Fehlerschwerpunkt", () => {
    const S = blank(); S.q.a1 = { s: 2, n: 4, w: 2 };
    expect(buildGraph(S, topics, [], qs).errors).toEqual([]);
  });
  it("kaum begonnen = offen", () => { expect(levelOf(0, 0, 10, 0)).toBe("offen"); expect(levelOf(0.8, 9, 10, 0)).toBe("stark"); });
});

// ---------------- Konzept-Graph (Prüfer-Tutor)

describe("Konzept-Graph", () => {
  const T03 = TAP2.topics.find((t) => t.id === "T03")!, PK = new Map(TAP2.pakete.map((p) => [p.id, p]));
  const cs = conceptsOf(T03, PK), K1 = cs[0].id, K2 = cs[1].id;
  const empty: TutorView = { ev: [], fv: {} };
  it("Konzepte = Kernaussagen der Lernpakete des Themas (P….n)", () => {
    expect(cs.length).toBe(T03.th.reduce((a, p) => a + (PK.get(p)?.kern.length ?? 0), 0));
    expect(K1).toMatch(/^[A-Z]\d+\.1$/); expect(cs[0].label).toBe(PK.get(K1.split(".")[0])!.kern[0][0]);
  });
  it("Beherrschung: Vorwissen + Belege, neuere zählen mehr; ohne alles offen", () => {
    expect(mastery([], null, 0)).toBeNull();
    expect(mastery([], 0.8, 2)).toBeCloseTo(0.8);
    const e = (id: string, at: number, w: number) => ({ id, at, art: "bewertung" as const, w });
    const up = mastery([e("a", 1, 0), e("b", 2, 1)], null, 0)!, down = mastery([e("a", 1, 1), e("b", 2, 0)], null, 0)!;
    expect(up).toBeGreaterThan(0.5); expect(down).toBeLessThan(0.5);
  });
  it("Einordnung: offene Fehlvorstellung = schwach, „sitzt“ erst ab zwei Belegen", () => {
    expect(conceptLevel(0.9, 1, 0)).toBe("festigen"); expect(conceptLevel(0.9, 2, 0)).toBe("stark");
    expect(conceptLevel(0.9, 5, 1)).toBe("schwach"); expect(conceptLevel(null, 0, 0)).toBe("offen");
  });
  it("Tutor-Belege und Fehlvorstellungen landen am richtigen Konzept; Fehlvorstellungen als eigene Knoten", () => {
    const tv: TutorView = {
      ev: [{ id: "1", at: 1, k: K1, t: "T03", art: "bewertung", w: 1 }, { id: "2", at: 2, k: K1, t: "T03", art: "beleg", w: 0.8 }, { id: "3", at: 3, k: K2, t: "T03", art: "fehlvorstellung", w: -0.5, f: "fv1", n: "falsch" }],
      fv: { fv1: { id: "fv1", k: K2, t: "T03", text: "2NF heißt atomar", seen: 3 } },
    };
    const g = buildConceptGraph(blank(), T03, TAP2.pakete, [], tv);
    const c1 = g.concepts.find((c) => c.id === K1)!, c2 = g.concepts.find((c) => c.id === K2)!;
    expect(c1.level).toBe("stark"); expect(c2.level).toBe("schwach"); expect(c2.fv).toBe(1);
    expect(g.miscon).toEqual([{ id: "fv1", konzept: K2, text: "2NF heißt atomar", count: 1, active: true, seen: 3 }]);
    expect(weakest(g, 1)[0].id).toBe(K2);
    const fixed = buildConceptGraph(blank(), T03, TAP2.pakete, [], { ...tv, fv: { fv1: { ...tv.fv.fv1, fix: 9 } } });
    expect(fixed.miscon[0].active).toBe(false); expect(fixed.concepts.find((c) => c.id === K2)!.fv).toBe(0);
  });
  it("Fragendaten der Lernrunden wirken als Vorwissen", () => {
    const g0 = buildConceptGraph(blank(), T03, TAP2.pakete, [], empty);
    expect(g0.m).toBeNull(); expect(g0.level).toBe("offen");
    const qs = Array.from({ length: 10 }, (_, i) => q("t3q" + i, "T03")), S = blank();
    qs.forEach((x) => { S.q[x.id] = { s: 2, n: 3, w: 0 }; });
    const g = buildConceptGraph(S, T03, TAP2.pakete, qs, empty);
    expect(g.concepts.every((c) => c.prior === 1 && c.m === 1)).toBe(true);
  });
});
