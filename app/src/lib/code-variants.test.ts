/**
 * Python-/JavaScript-Fassungen der Pseudocode-Beispiele: jede Fassung gehört zu einem Pseudocode-Block, der in der App
 * vorkommt (Lernpaket, Karte, Fragetext, Aufgabe, offene Frage) – sonst ist sie veraltet. Beide Sprachen vorhanden.
 */
import { describe, expect, it } from "vitest";
import { TAP2, ALL_EVENTS } from "@/content/catalog";
import raw from "@/content/code-variants.json";
import { codeKey, normCode, variantKeys, variantsFor } from "./code-variants";
import { qParts, situBlocks } from "./lernen";

/** Alle Texte, die die App als (Pseudo-)Code-Block darstellt – dieselben Stellen wie im Code (CodeVariants) */
function blocks(): string[] {
  const out: string[] = [];
  TAP2.pakete.forEach((p) => p.kern.forEach((k) => { if (k[2]) out.push(k[2]); }));
  [...TAP2.questions, ...ALL_EVENTS.flatMap((e) => e.kapitel.flatMap((k) => k.items))].forEach((q) => {
    const [sit] = qParts(q.q); if (sit) situBlocks(sit).filter((b) => b.code).forEach((b) => out.push(b.text));
    if (q.type === "card") out.push(q.a);
  });
  TAP2.ueb.forEach((u) => out.push(u.loesung));
  TAP2.open.forEach((o) => out.push(o.a));
  return out;
}

describe("Python-/JavaScript-Fassungen", () => {
  const keys = variantKeys(), present = new Set(blocks().map(codeKey));
  it("es gibt Fassungen, und jede gehört zu einem Block in der App", () => {
    expect(keys.length).toBeGreaterThanOrEqual(30);
    expect(keys.filter((k) => !present.has(k))).toEqual([]);
  });
  it("beide Sprachen vorhanden, ohne Tabs, Einrückung wie vorgesehen", () => {
    Object.values(raw as Record<string, { python: string; javascript: string }>).forEach((v) => {
      expect(v.python.trim().length).toBeGreaterThan(10); expect(v.javascript.trim().length).toBeGreaterThan(10);
      expect(v.python + v.javascript).not.toMatch(/\t/);
    });
  });
  it("n (Anzahl der Elemente) ist definiert, wenn der Code es nutzt – als Parameter oder per len()/.length", () => {
    const strip = (c: string) => c.replace(/#.*|\/\/.*|\/\*[\s\S]*?\*\//g, "");
    const fehlt: string[] = [];
    Object.entries(raw as Record<string, { python: string; javascript: string }>).forEach(([k, v]) => {
      const py = strip(v.python), js = strip(v.javascript);
      if (/\bn\b/.test(py) && !/^\s*n = len\(\w+\)|def \w+\([^)]*\bn\b/m.test(py)) fehlt.push(k + " python");
      if (/\bn\b/.test(js) && !/^\s*const n = \w+\.length;|function \w+\([^)]*\bn\b/m.test(js)) fehlt.push(k + " javascript");
    });
    expect(fehlt).toEqual([]);
  });
  it("Zuordnung über den Pseudocode-Text, unabhängig von Leerzeichen am Zeilenende", () => {
    const p = TAP2.pakete.find((x) => x.id === "P02")!.kern.find((k) => k[2])![2]!;
    expect(variantsFor(p)).not.toBeNull();
    expect(variantsFor(p.replace(/\n/g, "  \n") + "\n")).toEqual(variantsFor(p));
    expect(normCode(" a \r\n b ")).toBe("a\n b");
    expect(variantsFor("SELECT * FROM t")).toBeNull();
  });
});
