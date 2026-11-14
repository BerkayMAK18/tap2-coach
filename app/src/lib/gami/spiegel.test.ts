// @vitest-environment happy-dom
/**
 * Spiegelung der Belohnungen zwischen Geräten (seit v2.8, Live-App und Dev-App gleich):
 * Nach einem Abgleich zeigen alle Geräte denselben Stand – auch nach Ausgaben (Schatzkammer, Boosts), Login-Bonus,
 * Quests und Truhe. Gleichzeitige Änderungen gehen nie zulasten des Nutzers. Geräte mit v2.7 (ohne Update) arbeiten
 * weiter wie bisher und verlieren nichts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_Q } from "@/content/catalog";
import { addDays } from "@/lib/dates";
import { applyBoost, claimLogin, claimQuest, loginOffer, onAnswer, openChest, pull, rollDay, type Ctx } from "./core";
import { fresh, fix, merge, pack, parseStored, stab, type GState } from "./state";
import { newCtx, oldGami, seeded, stateWith, type World } from "./golden/harness";

const DAY = "2026-11-14";
type Dev = { G: GState; ctx: Ctx; w: World };
const dev = (raw: object, day = DAY): Dev => { const w: World = { S: stateWith([]), day, synced: true }; const G = parseStored(JSON.stringify(raw)); return { G, ctx: newCtx(w, () => G), w }; };
const sync = (a: Dev, b: Dev) => { merge(a.G, pack(b.G)); }; // a übernimmt den Stand von b
const same = (a: Dev, b: Dev) => expect(stab(pack(a.G))).toBe(stab(pack(b.G)));
const answer = (d: Dev, ok = true, i = 0) => onAnswer(d.G, d.ctx, BASE_Q[i], ok, false, -1, 1);
const START = { earned: 4000, level: 12, xp: 0, federn: 370, tickets: 0, loginClaimed: DAY, lastLogin: DAY, loginStreak: 3, calIdx: 2, banner: "rabe" };

beforeEach(() => { vi.useFakeTimers({ now: new Date("2026-11-14T10:00:00"), toFake: ["Date", "setTimeout"] }); localStorage.clear(); const r = seeded(9); vi.spyOn(Math, "random").mockImplementation(() => r()); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Spiegelung zwischen zwei Geräten", () => {
  it("Ausgaben in der Schatzkammer kommen auf dem anderen Gerät an (370 → 70 auf beiden)", () => {
    const a = dev(START), b = dev(START); sync(a, b); sync(b, a);
    for (let i = 0; i < 3; i++) pull(a.G, a.ctx, 1);
    const fa = a.G.federn; expect(fa).toBeLessThan(370);
    sync(b, a); expect(b.G.federn).toBe(fa); expect(b.G.pulls).toBe(a.G.pulls); expect(b.G.pity).toEqual(a.G.pity);
    sync(a, b); same(a, b);
  });
  it("eine Antwort auf dem anderen Gerät bringt ausgegebene Federn nicht zurück", () => {
    const a = dev(START), b = dev(START); sync(a, b); sync(b, a);
    pull(a.G, a.ctx, 1); const fa = a.G.federn;
    sync(b, a); answer(b); sync(a, b);
    expect(a.G.federn).toBe(fa + 5); same(a, b);
  });
  it("Login-Bonus nur einmal pro Tag, Kalender gleich", () => {
    const y = { ...START, loginClaimed: addDays(DAY, -1), lastLogin: addDays(DAY, -1) };
    const a = dev(y), b = dev(y); sync(a, b); sync(b, a);
    claimLogin(a.G, a.ctx, loginOffer(a.G, DAY)!); sync(b, a);
    expect(loginOffer(b.G, DAY)).toBeNull(); same(a, b);
    expect(b.G.calIdx).toBe(3); expect(b.G.loginStreak).toBe(4);
  });
  it("Quests und Truhe: abgeholt ist abgeholt", () => {
    const t = { day: DAY, answered: 60, correct: 58, maxCombo: 25, sowi: 12, t2: 20, green: 9, fixed: 6, fresh: 20 };
    const a = dev({ ...START, today: t }), b = dev({ ...START, today: t }); rollDay(a.G, DAY); rollDay(b.G, DAY); sync(a, b); sync(b, a);
    for (const id of a.G.quests!.ids) claimQuest(a.G, a.ctx, id);
    openChest(a.G, a.ctx); sync(b, a);
    expect(b.G.quests).toEqual(a.G.quests); expect(b.G.quests!.chest).toBe(true);
    for (const id of b.G.quests!.ids) expect(claimQuest(b.G, b.ctx, id)).toBe(false);
    expect(openChest(b.G, b.ctx)).toBe(false); same(a, b);
  });
  it("Boost benutzt: weniger Tränke und aktiver Trank auf beiden", () => {
    const a = dev({ ...START, boosts: { xp2: 2, shield: 1 } }), b = dev({ ...START, boosts: { xp2: 2, shield: 1 } }); sync(a, b); sync(b, a);
    vi.advanceTimersByTime(1000); applyBoost(a.G, a.ctx, "xp2"); sync(b, a);
    expect(b.G.boosts).toEqual({ xp2: 1, shield: 1 }); expect(b.G.xp2Left).toBe(10); same(a, b);
  });
  it("gleichzeitig verdient und ausgegeben: beides zählt", () => {
    const a = dev(START), b = dev(START); sync(a, b); sync(b, a);
    for (let i = 0; i < 4; i++) answer(a, true, i); // +20 Federn, +XP
    pull(b.G, b.ctx, 1); const spent = 370 - b.G.federn;
    sync(a, b); sync(b, a);
    same(a, b); expect(a.G.federn).toBe(370 + 20 - spent); expect(a.G.earned).toBeGreaterThan(4000);
  });
  it("Umstieg: zwei alte Stände mit verschiedenem Kontostand werden gleich (höherer Stand bleibt)", () => {
    const a = dev({ ...START, federn: 70 }), b = dev(START); sync(a, b); sync(b, a);
    same(a, b); expect(a.G.federn).toBe(370);
  });
});

describe("Mehrere Geräte über die Cloud: am Ende überall derselbe Stand", () => {
  for (const seed of [1, 2, 3, 4, 5]) it(`Startwert ${seed}`, () => {
    const rnd = seeded(seed * 77), devs = [dev(START), dev(START), dev(START)];
    let cloud: unknown = null;
    const up = (d: Dev) => { if (cloud) merge(d.G, cloud); cloud = pack(d.G); };
    for (let step = 0; step < 300; step++) {
      const d = devs[Math.floor(rnd() * devs.length)], x = rnd();
      vi.advanceTimersByTime(Math.floor(rnd() * 5000));
      if (x < 0.4) answer(d, rnd() < 0.8, Math.floor(rnd() * 50));
      else if (x < 0.5) pull(d.G, d.ctx, rnd() < 0.8 ? 1 : 10);
      else if (x < 0.55) applyBoost(d.G, d.ctx, rnd() < 0.5 ? "xp2" : "shield");
      else if (x < 0.6) { rollDay(d.G, d.w.day); const q = d.G.quests!.ids[Math.floor(rnd() * 5)]; claimQuest(d.G, d.ctx, q); openChest(d.G, d.ctx); }
      else if (x < 0.63) { const o = loginOffer(d.G, d.w.day); if (o) claimLogin(d.G, d.ctx, o); }
      else if (x < 0.65) devs.forEach((e) => { e.w.day = addDays(e.w.day, 1); });
      else up(d); // Abgleich
      expect(d.G.federn).toBeGreaterThanOrEqual(0); expect(d.G.tickets).toBeGreaterThanOrEqual(0);
    }
    for (let r = 0; r < 2; r++) devs.forEach(up);
    const p0 = stab(pack(devs[0].G));
    devs.forEach((d) => expect(stab(pack(d.G))).toBe(p0));
  });
});

describe("Geräte ohne Update (v2.7)", () => {
  const w = (): World => ({ S: stateWith([]), day: DAY, synced: true });
  const old = (raw: object) => { localStorage.setItem("tap2coach-gami", JSON.stringify(raw)); const o = oldGami(w(), true); o.init(); return o; };
  it("ein altes Gerät versteht das neue Paket wie bisher (zusätzliche Felder werden ignoriert)", () => {
    const n = dev(START); pull(n.G, n.ctx, 1); answer(n);
    const p = pack(n.G) as Record<string, unknown>, legacy = Object.fromEntries(Object.entries(p).filter(([k]) => !["k", "lc", "qd", "r", "u"].includes(k)));
    const o1 = old(START); o1.merge(p); const o2 = old(START); o2.merge(legacy);
    expect(o1.data()).toEqual(o2.data());
  });
  it("ein altes Paket wird nach der bisherigen Regel übernommen, das Konto zieht nach", () => {
    const o = old({ ...START, federn: 999, earned: 5000, level: 14 }), n = dev(START);
    merge(n.G, o.pack());
    expect(n.G.federn).toBe(999); expect(n.G.earned).toBe(5000);
    expect(n.G.kb!.fi - n.G.kb!.fo).toBe(999);
    const m = dev(START); merge(m.G, pack(n.G)); same(m, n);
  });
  it("nichts geht verloren: Besitz, Titel und Events bleiben bei jeder Richtung", () => {
    const n = dev({ ...START, owned: { "rabe-krone": 1 }, titles: { junior: 1 }, ev: { lf11a: { got: 5, kap: { k1: 3 } } } });
    const o = old({ ...START, owned: { "katze-diadem": 1 }, titles: { senior: 1 }, ev: { lf11a: { best: 0.9, kap: { k2: 4 } } } });
    o.merge(pack(n.G)); merge(n.G, o.pack());
    for (const g of [n.G, o.data() as GState]) { expect(g.owned["rabe-krone"] && g.owned["katze-diadem"]).toBeTruthy(); expect(Object.keys(g.titles)).toEqual(expect.arrayContaining(["junior", "senior"])); expect(g.ev.lf11a.got).toBe(5); }
  });
});

describe("Konto", () => {
  it("fix legt das Konto aus dem Kontostand an und hält es stimmig", () => {
    const G = fresh(); Object.assign(G, { federn: 370, tickets: 4, boosts: { xp2: 2, shield: 1 } }); fix(G);
    expect(G.kb).toEqual({ fi: 370, fo: 0, ti: 4, to: 0, xi: 2, xo: 0, si: 1, so: 0 });
    G.federn -= 100; fix(G); expect(G.kb!.fo).toBe(100);
  });
});
