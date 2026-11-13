/** Sync: Verschlüsselung (Hin und zurück, falscher Schlüssel) und Zusammenführen ohne Verlust. */
import { describe, expect, it } from "vitest";
import { aesKey, isKey, keyRaw, newSyncKey, seal, unseal } from "./crypto";
import { mergeStates } from "./sync-merge";
import { blank } from "./state";

const ctx = { knownTopics: new Set(["T01"]), deckTopic: {} };

describe("Verschlüsselung", () => {
  it("erzeugt gültige Schlüssel und entschlüsselt den eigenen Stand", async () => {
    const key = newSyncKey();
    expect(isKey(keyRaw(key))).toBe(true);
    const blob = await seal({ v: 7, q: { m1: { s: 2 } } }, await aesKey(key));
    expect(blob).toMatch(/^1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(await unseal(blob, await aesKey(key))).toEqual({ v: 7, q: { m1: { s: 2 } } });
  });
  it("ein fremder Schlüssel kann nichts lesen", async () => {
    const blob = await seal({ geheim: 1 }, await aesKey(newSyncKey()));
    await expect(unseal(blob, await aesKey(newSyncKey()))).rejects.toThrow();
  });
});

describe("Zusammenführen", () => {
  it("verliert nichts und nimmt pro Frage den neueren Stand", () => {
    const a = blank(), b = blank();
    a.q.m1 = { s: 0, b: 0, t: 1000, n: 3, w: 2 }; b.q.m1 = { s: 2, b: 2, t: 2000, n: 1, w: 0 };
    a.q.m2 = { s: 1, t: 500 }; b.q.m3 = { s: 2, t: 600 };
    a.mark.m2 = 1; b.mark.m3 = 1;
    a.runs = [{ mode: "sim", teil: "t1", pct: 80, note: 3, at: "2026-11-01", ts: 1 }];
    b.runs = [{ mode: "sim", teil: "t2", pct: 90, note: 2, at: "2026-11-02", ts: 2 }];
    a.log = { "2026-11-10": 5 }; b.log = { "2026-11-10": 9 };
    const m = mergeStates(a, b, ctx);
    expect(m.q.m1).toMatchObject({ s: 2, n: 3, w: 2 });
    expect(Object.keys(m.q).sort()).toEqual(["m1", "m2", "m3"]);
    expect(m.mark).toEqual({ m2: 1, m3: 1 });
    expect(m.runs.map((r) => r.ts)).toEqual([1, 2]);
    expect(m.log["2026-11-10"]).toBe(9);
  });
  it("ist in beide Richtungen gleich (Geräte landen beim selben Stand)", () => {
    const a = blank(), b = blank();
    a.q.m1 = { s: 1, b: 1, t: 1000 }; b.q.m1 = { s: 2, b: 2, t: 1000 };
    expect(mergeStates(a, b, ctx).q.m1).toEqual(mergeStates(b, a, ctx).q.m1);
  });
});

import { evMerge, syncWhen } from "./sync-merge";
describe("Regeln wie Live-App", () => {
  it("entfernte Markierung kommt durch Zusammenführen nicht zurück", () => {
    const a = blank(), b = blank(); b.mark.m1 = 1;
    const ev = evMerge(null, { m: { m1: [Date.now(), 0] } });
    expect(mergeStates(a, b, ctx, ev).mark).toEqual({});
  });
  it("Platzhalter-Uhrzeit 12:00 aus Links zählt als Tagesbeginn", () => {
    const noon = new Date(2026, 10, 10, 12, 0, 0, 0).getTime();
    expect(syncWhen({ s: 1, t: noon })).toBe(noon - 12 * 3600000);
  });
});
