/** Wissensgraph: Einordnung der Themen und Fehlerschwerpunkte. */
import { describe, expect, it } from "vitest";
import { buildGraph, levelOf } from "./graph";
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
