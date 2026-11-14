import { describe, expect, it } from "vitest";
import { BASE_Q, TAP2 } from "@/content/catalog";
import { OPDRILLS, OP_LADDER, TECHNIK, codeCard, drillOrder, errSummary, nextDrill, pickDrill, startDrill, tutStats, weakTopics } from "./tipps";
import { blank, type ErrEntry, type State } from "./state";

const e = (cause: string, pts: number): ErrEntry => ({ at: "2026-11-01", src: "ueb", ref: "x", pts, cause });

describe("Fehlerprotokoll-Auswertung", () => {
  it("summiert verlorene Punkte je Ursache, absteigend; unbekannte Ursachen zählen nicht", () => {
    const s = errSummary([e("zeit", 2), e("wissen", 5), e("zeit", 4.5), e("quatsch", 99), e("", 3)]);
    expect(s).toEqual({ n: 3, tot: 11.5, rows: [["zeit", 6.5], ["wissen", 5]] });
  });
  it("leer: keine Einträge, Gesamtsumme 1 (keine Division durch 0)", () => {
    expect(errSummary([])).toEqual({ n: 0, tot: 1, rows: [] });
  });
});

describe("Schwächste Themen", () => {
  it("höchstens 5, Pflichtthemen zuerst, ohne fertige Themen", () => {
    const w = weakTopics(blank());
    expect(w.length).toBe(5);
    expect(w.every((x) => x.c.open > 0)).toBe(true);
    const firstNonMuss = w.findIndex((x) => x.t.prio !== "Muss");
    if (firstNonMuss >= 0) expect(w.slice(firstNonMuss).every((x) => x.t.prio !== "Muss")).toBe(true);
  });
  it("ein fast fertiges Pflichtthema rutscht nach hinten", () => {
    const t = weakTopics(blank())[0].t;
    const S: State = { ...blank(), q: Object.fromEntries(BASE_Q.filter((q) => q.topic === t.id).slice(1).map((q) => [q.id, { s: 2, b: 3 }])) };
    expect(weakTopics(S)[0].t.id).not.toBe(t.id);
  });
  it("Prüfungstechnik-Paket ist im Katalog", () => {
    expect(TECHNIK?.kern.length).toBeGreaterThan(0);
  });
});

describe("Operator-Trainer", () => {
  it("Inhalte aus der Live-App: 12 Übungen mit je 3 Antworten, Treppe mit 3 Stufen", () => {
    expect(OPDRILLS).toHaveLength(12);
    expect(OPDRILLS.every((x) => x.opts.length === 3 && x.right >= 0 && x.right < 3)).toBe(true);
    expect(OP_LADDER.map((x) => x[0])).toEqual(["I", "II", "III"]);
  });
  it("jede Übung genau einmal, Punkte nur für die richtige, zweiter Klick zählt nicht", () => {
    let d = startDrill();
    expect([...d.order].sort((a, b) => a - b)).toEqual(OPDRILLS.map((_, k) => k));
    d = drillOrder(d);
    const ord = d.ord[d.order[0]];
    expect([...ord].sort()).toEqual([0, 1, 2]);
    expect(drillOrder(d).ord[d.order[0]]).toBe(ord); // bleibt gemischt wie beim ersten Mal
    const x = OPDRILLS[d.order[0]];
    d = pickDrill(d, x.right);
    expect([d.pick, d.score]).toEqual([x.right, 1]);
    expect(pickDrill(d, (x.right + 1) % 3)).toBe(d);
    d = nextDrill(d);
    expect([d.i, d.pick, d.score]).toEqual([1, null, 1]);
    d = pickDrill(drillOrder(d), (OPDRILLS[d.order[1]].right + 1) % 3);
    expect(d.score).toBe(1);
  });
});

describe("Tutorial", () => {
  it("Fragen pro Tag: rot/neu doppelt, gelb einfach, bis zum Vortag", () => {
    const n = BASE_Q.length;
    expect(tutStats(blank(), 11)).toMatchObject({ need: 2 * n, perDay: Math.ceil((2 * n) / 10), dueN: 0 });
    expect(tutStats(blank(), 0).perDay).toBe(2 * n);
  });
  it("Code-Karte: erste nicht grüne", () => {
    const ids = Object.keys(TAP2.codeLang);
    expect(codeCard(blank())?.id).toBe(ids[0]);
    expect(codeCard({ ...blank(), q: { [ids[0]]: { s: 2, b: 3 } } })?.id).toBe(ids[1]);
  });
});
