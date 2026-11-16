import { describe, expect, it } from "vitest";
import { TAP2, TP } from "@/content/catalog";
import { SOWI_DISTRACTORS, SOWI_RIGHT } from "@/content/sowi-mc";
import { asLernQ } from "./sowi-mc";

const isSowi = (t: string) => TP[t]?.teil === "SoWi";
const cards = TAP2.questions.filter((q) => q.type === "card" && isSowi(q.topic));

describe("SoWi als Multiple Choice", () => {
  it("jede SoWi-Karte hat genau drei verschiedene Ablenker, keiner gleich der Musterantwort; keine verwaisten Einträge", () => {
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((q) => {
      const d = SOWI_DISTRACTORS[q.id];
      expect(d, q.id).toBeDefined();
      expect(new Set(d.map((x) => x.trim())).size, q.id).toBe(3);
      d.forEach((x) => { expect(x.trim().length, q.id).toBeGreaterThan(10); expect(x.trim(), q.id).not.toBe(q.type === "card" ? q.a.trim() : ""); });
    });
    const ids = new Set(cards.map((q) => q.id));
    Object.keys(SOWI_DISTRACTORS).forEach((k) => expect(ids.has(k), k).toBe(true));
    Object.entries(SOWI_RIGHT).forEach(([k, r]) => { expect(ids.has(k), k).toBe(true); expect(SOWI_DISTRACTORS[k].includes(r), k).toBe(false); });
  });
  it("Länge verrät die Lösung nicht: richtige Antwort ist selten die längste, Ablenker ähnlich lang", () => {
    let longest = 0;
    cards.forEach((q) => {
      if (q.type !== "card") return;
      const d = SOWI_DISTRACTORS[q.id], a = (SOWI_RIGHT[q.id] ?? q.a).length;
      if (a > Math.max(...d.map((x) => x.length))) longest++;
      d.forEach((x) => expect(x.length / a, q.id).toBeGreaterThan(0.3));
    });
    expect(longest / cards.length).toBeLessThan(0.35); // bei vier Optionen zufällig 25 %
  });
  it("Karte wird zur Auswahlfrage mit gleicher ID; Nicht-SoWi und Auswahlfragen bleiben unverändert", () => {
    const c = cards[0], m = asLernQ(c, isSowi);
    expect(m).toMatchObject({ id: c.id, type: "mc", topic: c.topic, q: c.q });
    if (m.type === "mc" && c.type === "card") { expect(m.opts).toHaveLength(4); expect(m.opts[m.right]).toBe(SOWI_RIGHT[c.id] ?? c.a); expect(m.why).toContain(c.a); }
    const other = TAP2.questions.find((q) => q.type === "card" && !isSowi(q.topic))!;
    expect(asLernQ(other, isSowi)).toBe(other);
    const mc = TAP2.questions.find((q) => q.type === "mc")!;
    expect(asLernQ(mc, isSowi)).toBe(mc);
  });
});
