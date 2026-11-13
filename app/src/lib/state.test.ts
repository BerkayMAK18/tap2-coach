/**
 * Lernstand: Echte Daten müssen unverändert bleiben, fremde/kaputte Daten werden entschärft,
 * alte Formate werden migriert. Die Fälle stammen aus dem Security-Check der Live-App (v2.7.4).
 */
import { describe, expect, it } from "vitest";
import { normalize } from "./state";

const ctx = { knownTopics: new Set(["T01", "T02", "T05"]), deckTopic: { algo: "T01", sql: "T02" } };
const canon = (o: unknown) => JSON.stringify(o, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));

const legit = {
  v: 7,
  q: { "k:web6": { b: 3, s: 2, d: "2026-11-20", t: 1762990000000, n: 4, w: 1 }, m12: { s: 0, n: 1, w: 1, b: 0, d: "2026-11-13", t: 1763000000000 }, o3: { s: -1 }, "ev:lf11a:mod1": { b: 1, s: 1, d: "2026-11-14", t: 1763010000000, n: 1, w: 0 } },
  mark: { m12: 1 },
  custom: { T01: [{ id: "c1731000000000", f: "Was ist ein Interface?", b: "Vertrag" }], T05: [{ id: "c1731000000001", f: "SELECT * FROM t WHERE a<b", b: '<html> & "x"' }] },
  ueb: { U1: { p: 12.5, at: "2026-11-10", n: 2, cause: "zeit" } },
  runs: [{ mode: "sim", teil: "t1", pct: 83.3, note: 2, at: "2026-11-01", ts: 1761990000000, detail: "25/30" }, { mode: "easy", teil: "wiso", pct: 100, note: 1, at: "2026-11-06", ts: 1762400000000 }],
  log: { "2026-11-10": 34 },
  last: "m12",
  errlog: [{ at: "2026-11-10", src: "ueb", ref: "U1 Messwerte auswerten", pts: 2.5, cause: "zeit" }],
};

describe("normalize", () => {
  it("lässt einen echten Lernstand exakt unverändert", () => {
    expect(canon(normalize(structuredClone(legit), ctx))).toBe(canon(legit));
  });

  it("entschärft präparierte Daten ohne Absturz", () => {
    const x = normalize({ v: 7, q: { a: "str" }, custom: { T01: "x", ZZZ: [{ id: "c1", f: "<img>", b: "b" }] }, runs: [{ mode: "real", teil: "t1", pct: "<img src=x>", ts: 1 }], errlog: { a: 1 }, log: { "2026-11-13": "<img>", "x<y": 3 }, ueb: { U1: null, U2: { p: "9", at: "9999-12-31" } }, __proto__: { evil: 1 } }, ctx);
    expect(x.q).toEqual({});
    expect(x.custom).toEqual({ T01: [{ id: "c1", f: "<img>", b: "b" }] }); // unbekanntes Thema → T01, Text wird bei der Ausgabe escaped
    expect(x.runs[0].pct).toBe(0);
    expect(x.errlog).toEqual([]);
    expect(x.log).toEqual({ "2026-11-13": 0 });
    expect(x.ueb.U2.at <= new Date().toISOString().slice(0, 10)).toBe(true); // Zukunftsdatum gekappt
    expect(Object.getPrototypeOf(x)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).evil).toBeUndefined();
  });

  it("migriert Sicherungen vor Version 6", () => {
    const x = normalize({ v: 5, qstat: { m1: { r: 2, w: 0 }, m2: { r: 1, w: 2 } }, custom: { algo: [{ id: "c9", f: "f", b: "b" }] } }, ctx);
    expect(x.q.m1.s).toBe(2);
    expect(x.q.m2.s).toBe(0);
    expect(x.q.m1.b).toBe(2);
    expect(x.custom.T01[0].id).toBe("c9");
    expect(x.v).toBe(7);
  });
});
