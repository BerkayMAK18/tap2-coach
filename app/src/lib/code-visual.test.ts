/** Ablauf-Visualisierung: Simulatoren liefern richtige Ergebnisse, Zeilen passen zum jeweiligen Pseudocode. */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import raw from "@/content/code-variants.json";
import { codeKey, normCode } from "./code-variants";
import { SAMPLE, findLines, randomData, simulate, visualKeys, type Algo } from "./code-visual";
import { seeded } from "./gami/golden/harness";

// Pseudocode je Prüfsumme aus dem Katalog (Lernpakete, Karten, Aufgaben, offene Fragen)
const texts = new Map<string, string>();
TAP2.pakete.forEach((p) => p.kern.forEach((k) => { if (k[2]) texts.set(codeKey(k[2]), k[2]); }));
TAP2.questions.forEach((q) => { if (q.type === "card") texts.set(codeKey(q.a), q.a); });
TAP2.ueb.forEach((u) => texts.set(codeKey(u.loesung), u.loesung)); TAP2.open.forEach((o) => texts.set(codeKey(o.a), o.a));
const ALGO: Record<string, Algo> = { "15b322q": "bubble", "1ebfb30": "bubble", glm0ga: "bubble", q135p7: "selection", "1sb26vp": "selection", breabz: "selection", "10fod6e": "insertion", lhrm61: "insertion", "13ekumi": "binary", "1f2ydvp": "binary", "18jbbsi": "max", "1kg0vkq": "max", "1lihgq2": "linear" };

describe("Ablauf", () => {
  it("jeder Block mit Ablauf existiert im Katalog", () => { visualKeys().forEach((k) => expect(texts.has(k), k).toBe(true)); });
  it("Sortierverfahren sortieren, Zeilen liegen im Pseudocode und sind nicht leer", () => {
    for (const k of visualKeys()) {
      const p = texts.get(k)!, algo = ALGO[k], v = { algo, absteigend: k === "breabz" }, n = normCode(p).split("\n").length;
      const fr = simulate(v, p, SAMPLE[algo]);
      fr.forEach((f) => f.lines.forEach((l) => { expect(l).toBeGreaterThanOrEqual(0); expect(l).toBeLessThan(n); }));
      expect(fr.filter((f) => f.lines.length).length, k).toBeGreaterThan(fr.length / 2);
      const last = fr[fr.length - 1].arr, sorted = SAMPLE[algo].arr.slice().sort((a, b) => (v.absteigend ? b - a : a - b));
      if (["bubble", "selection", "insertion"].includes(algo)) expect(last, k).toEqual(sorted);
    }
  });
  it("Zeilen werden über Muster gefunden (Bubble, Insertion, binäre Suche)", () => {
    const b = findLines(texts.get("15b322q")!); expect([b.outer, b.inner, b.cond, b.swapLines]).toEqual([0, 1, 2, [3, 4, 5]]);
    const ins = findLines(texts.get("10fod6e")!); expect([ins.take, ins.jInit, ins.loop, ins.shift, ins.dec, ins.insert]).toEqual([1, 2, 3, 4, 5, 7]);
    const bs = findLines(texts.get("13ekumi")!); expect([bs.mid, bs.eq, bs.hit, bs.lt, bs.goRight, bs.goLeft, bs.miss]).toEqual([3, 4, 5, 6, 7, 9, 12]);
    expect(findLines(texts.get("q135p7")!).swapLines).toEqual([5]); // Tausch in einer Zeile
  });
  it("Suchen: gefunden und nicht gefunden, Maximum richtig", () => {
    const bs = texts.get("1f2ydvp")!;
    expect(simulate({ algo: "binary" }, bs, { arr: [1, 3, 5, 7, 9], x: 7 }).at(-1)!.found).toBe(3);
    expect(simulate({ algo: "binary" }, bs, { arr: [1, 3, 5, 7, 9], x: 4 }).at(-1)!.text).toMatch(/Rückgabe -1/);
    expect(simulate({ algo: "linear" }, texts.get("1lihgq2")!, { arr: [4, 2, 8], x: 8 }).at(-1)!.found).toBe(2);
    expect(simulate({ algo: "max" }, texts.get("18jbbsi")!, { arr: [3, 9, 2, 9] }).at(-1)!.found).toBe(1);
  });
  it("zufällige Daten: viele Durchläufe ergeben immer ein sortiertes Feld bzw. das richtige Ergebnis", () => {
    const r = seeded(7);
    for (let t = 0; t < 50; t++) for (const algo of ["bubble", "selection", "insertion", "binary"] as Algo[]) {
      const d = randomData(algo, r), p = texts.get(algo === "bubble" ? "1ebfb30" : algo === "selection" ? "1sb26vp" : algo === "insertion" ? "lhrm61" : "1f2ydvp")!;
      const last = simulate({ algo }, p, d).at(-1)!;
      if (algo === "binary") expect(last.found === undefined ? !d.arr.includes(d.x!) : d.arr[last.found] === d.x).toBe(true);
      else expect(last.arr).toEqual(d.arr.slice().sort((a, b) => a - b));
    }
  });
  it("Zeilen-Erklärungen haben so viele Einträge wie der Pseudocode Zeilen", () => {
    Object.entries(raw as Record<string, { erklaerung?: string[] }>).forEach(([k, v]) => {
      const p = texts.get(k); if (!p || !v.erklaerung) return;
      expect(v.erklaerung.length, k).toBe(normCode(p).split("\n").length);
    });
  });
});
