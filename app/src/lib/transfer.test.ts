import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { blank, type State } from "./state";
import { txApply, txDecode, txEncode, txExpand, txLens, txSummary } from "./transfer";

const T = new Date("2026-11-10T09:00:00").getTime();
const S0: State = {
  ...blank(),
  q: { m0: { s: 2, b: 3, d: "2026-11-17", t: T, n: 3, w: 0 }, m400: { s: 0, b: 0, d: "2026-11-14", t: T, n: 1, w: 1 }, "k:sql3": { s: 1, b: 1, d: "2026-11-12", n: 1 }, "ev:lf11a:mod1": { s: 2, b: 2, d: "2026-11-15", t: T, n: 1 }, c123: { s: 1, b: 1, d: "2026-11-11", t: T } },
  mark: { m0: 1, "k:algo0": 1 },
  ueb: { S1: { p: 12, at: "2026-11-09", n: 2 } },
  runs: [{ mode: "sim", teil: "t1", pct: 80, note: 3, at: "2026-11-08", ts: 1, detail: "24/30" }],
  errlog: [{ at: "2026-11-08", src: "ueb", ref: "S1 x", pts: 4, cause: "zeit" }],
  custom: { T01: [{ id: "c123", f: "Frage", b: "Antwort" }] },
  log: { "2026-11-10": 7 },
};

describe("Übertragen per Link/QR", () => {
  it("Listenlängen wie die Live-App: erst Auswahlfragen, dann Karten je Deck", () => {
    const L = txLens();
    expect(L[0][0]).toBe("m");
    expect(L.slice(1).map((x) => x[0])).toEqual(Object.keys(TAP2.decks));
    expect(txExpand(L).length).toBe(TAP2.questions.length);
    expect(() => txExpand([["M", 1]])).toThrow();
    expect(() => txExpand([["m", 20001]])).toThrow();
  });
  it("Hin und zurück (Link mit allem): Ampel, Box, Markierungen, Aufgaben, Prüfungen, Protokoll, eigene Fragen", async () => {
    const code = await txEncode(S0, true, { lv: 3 }, "2026-11-14");
    expect(code[0]).toBe("1");
    const inc = await txDecode("https://example.org/#import=" + code);
    expect(inc.at).toBe("2026-11-14");
    expect(inc.q.m0).toMatchObject({ s: 2, b: 3, d: "2026-11-17" }); // letzte Antwort am 10.11. + IV[3] = 7 Tage
    expect(inc.q.m400).toMatchObject({ s: 0, b: 0 });
    expect(inc.q["k:sql3"]).toMatchObject({ s: 1, b: 1, d: "2026-11-12" }); // ohne Zeitstempel: Fälligkeit bleibt
    expect(inc.q["ev:lf11a:mod1"]).toMatchObject({ s: 2, b: 2 });
    expect(inc.mark).toEqual({ m0: 1, "k:algo0": 1 });
    expect(inc.ueb).toEqual({ S1: [12, "2026-11-09"] });
    expect(inc.runs).toEqual(S0.runs); expect(inc.errlog).toEqual(S0.errlog); expect(inc.custom).toEqual(S0.custom); expect(inc.log).toEqual(S0.log);
    expect([inc.full, inc.g]).toEqual([true, { lv: 3 }]);
    expect(txSummary(inc)).toBe("5 Fragen bearbeitet, davon 2 grün, 1 Prüfungen, 1 eigene Fragen");
  });
  it("QR-Variante ohne Prüfungen und Protokoll", async () => {
    const inc = await txDecode(await txEncode(S0, false, null, "2026-11-14"));
    expect([inc.full, inc.runs, inc.errlog]).toEqual([false, [], []]);
  });
  it("kaputte oder fremde Codes werden abgelehnt", async () => {
    await expect(txDecode("quatsch")).rejects.toThrow();
    await expect(txDecode("1AAAA")).rejects.toThrow();
  });
  it("Zusammenführen: neuere Antwort gewinnt, nichts geht verloren; Ersetzen behält eigene Event-Stände", async () => {
    const inc = await txDecode(await txEncode(S0, true, null, "2026-11-14"));
    const mine: State = { ...blank(), q: { m0: { s: 0, b: 0, d: "2026-11-14", t: new Date("2026-11-13T09:00:00").getTime() }, m5: { s: 1, b: 1, d: "2026-11-15", t: T }, "ev:lf11a:auf1": { s: 1, b: 1 } }, runs: [{ mode: "real", teil: "t2", pct: 90, note: 2, at: "2026-11-01", ts: 2 }] };
    const m = txApply(mine, inc, "merge");
    expect(m.q.m0.s).toBe(0); // hier neuer (13.11.) als im Link (10.11.)
    expect(m.q.m400.s).toBe(0); expect(m.q.m5.s).toBe(1);
    expect(m.runs.map((x) => x.ts)).toEqual([1, 2]);
    expect(mine.runs).toHaveLength(1); // Eingabe bleibt unverändert
    const r = txApply(mine, inc, "replace");
    expect(r.q.m5).toBeUndefined(); expect(r.q["ev:lf11a:auf1"]).toBeDefined(); expect(r.q.m0.s).toBe(2);
    expect(r.ueb.S1).toEqual({ p: 12, at: "2026-11-09", n: 1 });
  });
});
