/** Tutor-Brücke: Ergebnis-Block aus Claude ist Fremdtext und wird streng geprüft. */
import { describe, expect, it } from "vitest";
import tap2 from "@/content/generated/tap2.json";
import type { Tap2Catalog } from "@/content/schema";
import { buildKnowledgeMd, parseResult } from "./tutor-bridge";

const known = new Set(["T01", "T05"]);
const block = (o: unknown) => "Gut gemacht!\n```tap2-ergebnis\n" + JSON.stringify(o) + "\n```\nBis morgen.";

describe("parseResult", () => {
  it("liest einen gültigen Block aus der ganzen Antwort", () => {
    const r = parseResult(block({ version: 1, verstanden: [{ thema: "T05", aussage: "JOIN erklären", beleg: "Meine Antwort …" }], fehlvorstellungen: [{ thema: "T01", aussage: "Schleifengrenze" }], ueben: ["T05", "T05", "T01"] }), known);
    expect(r.verstanden[0]).toMatchObject({ thema: "T05", aussage: "JOIN erklären" });
    expect(r.ueben).toEqual(["T05", "T01"]);
  });
  it("verwirft unbekannte Themen und begrenzt Mengen", () => {
    const r = parseResult(block({ version: 1, verstanden: [{ thema: "__proto__", aussage: "x", beleg: "y" }, { thema: "T99", aussage: "x", beleg: "y" }], ueben: ["T01", "<img>"] }), known);
    expect(r.verstanden).toEqual([]);
    expect(r.ueben).toEqual(["T01"]);
  });
  it("lehnt kaputte oder fremde Formate verständlich ab", () => {
    expect(() => parseResult("kein json", known)).toThrow(/Ergebnis-Block/);
    expect(() => parseResult(block({ version: 2 }), known)).toThrow(/Format/);
    expect(() => parseResult(block({ version: 1, verstanden: [{ thema: "T01", aussage: "x".repeat(500), beleg: "y" }] }), known)).toThrow(/Format/);
  });
});

describe("buildKnowledgeMd", () => {
  it("enthält alle Themen mit ID und bleibt handlich", () => {
    const md = buildKnowledgeMd(tap2 as unknown as Tap2Catalog);
    expect(md).toContain("## T01 ·");
    expect(md.length).toBeLessThan(600_000);
  });
});
