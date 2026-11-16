/** Tutor-Lehrplan: deterministisch aus Graph, Prüfungsdatum, Muss-Themen und Fehlvorstellungen; passt sich an. */
import { describe, expect, it } from "vitest";
import type { ConceptGraph } from "./graph";
import { SLOTS, bedarf, buildLehrplan, type PlanTopic } from "./lehrplan";

const NOW = Date.parse("2026-11-14T12:00:00");
const g = (id: string, m: number | null, fv = 0): ConceptGraph => ({
  topic: id, m, level: "festigen",
  concepts: [{ id: id + ".1", label: "K1", paket: "P", paketTitel: "P", m, level: "festigen", n: 1, prior: null, fv: 0 }, { id: id + ".2", label: "K2", paket: "P", paketTitel: "P", m: m == null ? null : m / 2, level: "schwach", n: 0, prior: null, fv: 0 }],
  miscon: Array.from({ length: fv }, (_, i) => ({ id: "fv" + i, text: "x", count: 1, active: true, seen: 1 })),
});
const topics = (): PlanTopic[] => [
  { id: "T01", name: "Algorithmen", muss: true, g: g("T01", 0.3) },
  { id: "T02", name: "SQL", muss: true, g: g("T02", 0.9), lastSession: NOW - 864e5 },
  { id: "T05", name: "Testen", muss: false, g: g("T05", 0.2) },
  { id: "T07", name: "Sicherheit", muss: true, g: g("T07", 0.7, 2) },
  { id: "T14", name: "Umweltschutz", muss: false, g: g("T14", null) },
];

describe("Lehrplan", () => {
  it("deterministisch: gleiche Eingaben → gleicher Plan", () => {
    expect(buildLehrplan(topics(), "2026-11-14", "2026-11-25", NOW)).toEqual(buildLehrplan(topics(), "2026-11-14", "2026-11-25", NOW));
  });
  it("Bedarf: Muss-Themen und Schwächen vorn, Fehlvorstellungen erhöhen, kürzlich geübt senkt", () => {
    const p = buildLehrplan(topics(), "2026-11-14", "2026-11-25", NOW);
    expect(p.ranking[0].topic).toBe("T01"); // Muss + 30 %
    expect(p.ranking.at(-1)!.topic).toBe("T02"); // 90 % und gestern geübt
    expect(bedarf(topics()[3], NOW).n).toBeGreaterThan(bedarf({ ...topics()[3], g: g("T07", 0.7) }, NOW).n);
    expect(p.empfehlung).toMatchObject({ kind: "sitzung", topic: "T01" });
    expect(p.empfehlung?.kind === "sitzung" && p.empfehlung.fokus[0].id).toBe("T01.2"); // schwächstes Konzept zuerst
  });
  it("Tage bis zur Prüfung, je Tag höchstens SLOTS Sitzungen, Themen wechseln, Vortag = Wiederholung", () => {
    const p = buildLehrplan(topics(), "2026-11-14", "2026-11-25", NOW);
    expect(p.tage).toBe(11); expect(p.days.length).toBe(11);
    expect(p.days.every((d) => d.items.length <= SLOTS)).toBe(true);
    expect(new Set(p.days[0].items.map((i) => i.kind === "sitzung" && i.topic)).size).toBe(p.days[0].items.length);
    expect(p.days.at(-1)!.items[0].kind).toBe("wiederholung");
    const all = p.days.flatMap((d) => d.items).filter((i) => i.kind === "sitzung").map((i) => i.kind === "sitzung" && i.topic);
    expect(new Set(all).size).toBeGreaterThanOrEqual(4); // nicht nur ein Thema
  });
  it("ab 3 Tagen vor der Prüfung nur Muss-Themen und Themen mit offener Fehlvorstellung", () => {
    const p = buildLehrplan(topics(), "2026-11-22", "2026-11-25", NOW);
    p.days.slice(0, -1).forEach((d) => d.items.forEach((i) => { if (i.kind === "sitzung") expect(["T01", "T02", "T07"]).toContain(i.topic); }));
  });
  it("passt sich an: nach einer guten Sitzung rutscht das Thema nach hinten", () => {
    const before = buildLehrplan(topics(), "2026-11-14", "2026-11-25", NOW);
    const t = topics(); t[0] = { ...t[0], g: g("T01", 0.95), lastSession: NOW };
    const after = buildLehrplan(t, "2026-11-14", "2026-11-25", NOW);
    expect(before.empfehlung?.kind === "sitzung" && before.empfehlung.topic).toBe("T01");
    expect(after.empfehlung?.kind === "sitzung" && after.empfehlung.topic).not.toBe("T01");
  });
  it("Prüfung vorbei → kein Plan, Rangfolge bleibt", () => {
    const p = buildLehrplan(topics(), "2026-11-25", "2026-11-25", NOW);
    expect(p.days).toEqual([]); expect(p.empfehlung).toBeNull(); expect(p.ranking.length).toBe(5);
  });
});
