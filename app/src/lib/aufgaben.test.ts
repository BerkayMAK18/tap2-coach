import { describe, expect, it } from "vitest";
import { TOPICS } from "@/content/catalog";
import { CAUSES, UEB, UEB_TOPIC, isCause, logCause, parsePts, reportUrlUeb, saveUebRec, setUebCauseRec, uebChip, uebGroups } from "./aufgaben";
import { blank, type ErrEntry } from "./state";

describe("Aufgaben (rUeb der Live-App)", () => {
  it("Katalog: 20 Aufgaben, SQL-Aufgaben zeigen die Tabellen", () => {
    expect(UEB).toHaveLength(20);
    expect(UEB.filter((u) => u.schema).map((u) => u.id)).toEqual(["S1", "S2", "S3", "S4"]);
  });
  it("Gruppen nach Thema in Katalog-Reihenfolge, nichts geht verloren", () => {
    const g = uebGroups();
    expect(g.flatMap(([, l]) => l).length).toBe(UEB.length);
    expect(g[0][0]).toBe(UEB[0].thema);
  });
  it("Theorie-Link: erstes Thema, das die Aufgabe enthält", () => {
    const tid = UEB_TOPIC.S1;
    expect(tid).toBeDefined();
    expect(TOPICS.findIndex((t) => t.id === tid)).toBeGreaterThanOrEqual(0);
  });
  it("Chip-Farbe: ab 81 % ok, ab 67 % warn, sonst bad", () => {
    expect([uebChip(81, 100), uebChip(80.9, 100), uebChip(67, 100), uebChip(66, 100)]).toEqual(["ok", "warn", "warn", "bad"]);
  });
  it("Punkte-Eingabe wird auf 0…max begrenzt, keine Zahl speichert nichts", () => {
    expect([parsePts("7.5", 10), parsePts("12", 10), parsePts("-3", 10), parsePts("", 10), parsePts("abc", 10)]).toEqual([7.5, 10, 0, null, null]);
  });
  it("Speichern zählt Versuche hoch und verwirft die alte Ursache (wie die Live-App)", () => {
    let S = saveUebRec(blank(), "S1", 10, "2026-11-01");
    expect(S.ueb.S1).toEqual({ p: 10, at: "2026-11-01", n: 1 });
    S = { ...S, ueb: { S1: { ...S.ueb.S1, cause: "zeit" } } };
    S = saveUebRec(S, "S1", 12, "2026-11-02");
    expect(S.ueb.S1).toEqual({ p: 12, at: "2026-11-02", n: 2 });
  });
});

describe("Fehlerprotokoll (logCause der Live-App)", () => {
  it("ein Eintrag je Quelle, Bezug und Tag; ohne Ursache wird er entfernt", () => {
    const old: ErrEntry = { at: "2026-11-01", src: "ueb", ref: "S1 x", pts: 2, cause: "wissen" };
    let r = logCause([old], "ueb", "S1 x", 3, "zeit", "2026-11-02");
    expect(r.errlog).toEqual([old, { at: "2026-11-02", src: "ueb", ref: "S1 x", pts: 3, cause: "zeit" }]);
    expect(r.ev).toEqual(["2026-11-02|ueb|S1 x", r.errlog[1]]);
    r = logCause(r.errlog, "ueb", "S1 x", 3, "operator", "2026-11-02");
    expect(r.errlog.map((x) => x.cause)).toEqual(["wissen", "operator"]);
    r = logCause(r.errlog, "ueb", "S1 x", 3, null, "2026-11-02");
    expect(r.errlog).toEqual([old]);
    expect(r.ev).toEqual(["2026-11-02|ueb|S1 x", null]);
  });
  it("Ursache an einer Aufgabe: Bezug „ID Titel“, Punkte = verlorene Punkte, zweiter Klick nimmt sie weg", () => {
    const u = UEB.find((x) => x.id === "S1")!;
    const S0 = saveUebRec(blank(), "S1", u.max - 4, "2026-11-02");
    const a = setUebCauseRec(S0, "S1", "zeit", "2026-11-02")!;
    expect(a.S.ueb.S1.cause).toBe("zeit");
    expect(a.S.errlog).toEqual([{ at: "2026-11-02", src: "ueb", ref: "S1 " + u.titel, pts: 4, cause: "zeit" }]);
    const b = setUebCauseRec(a.S, "S1", "zeit", "2026-11-02")!;
    expect(b.S.ueb.S1).not.toHaveProperty("cause");
    expect(b.S.errlog).toEqual([]);
    expect(setUebCauseRec(blank(), "S1", "zeit")).toBeNull(); // ohne Punkte keine Ursache
  });
  it("Ursachen-Schlüssel wie im Lernstand der Live-App", () => {
    expect(Object.keys(CAUSES)).toEqual(["wissen", "operator", "aufgabe", "zeit", "fluecht"]);
    expect([isCause("zeit"), isCause("toString"), isCause("x")]).toEqual([true, false, false]);
  });
});

describe("Fehler melden", () => {
  it("vorausgefülltes Issue mit Aufgaben-ID und Titel", () => {
    const u = UEB[0], url = new URL(reportUrlUeb(u)), p = url.searchParams;
    expect(url.pathname).toBe("/BerkayMAK18/tap2-coach/issues/new");
    expect(p.get("title")).toContain("Fehler in Aufgabe " + u.id + ": ");
    expect(p.get("labels")).toBe("fehler");
    expect(p.get("body")).toContain("**Aufgabe:** `" + u.id + "` – " + u.titel);
  });
});
