// @vitest-environment happy-dom
/**
 * Golden-Tests: neue TS-Fassung des Belohnungs-Moduls gegen das Original der Live-App (golden/original.js).
 * Gleiche Eingaben (Stände, Antwortfolgen, Zufall mit festem Startwert, Tag, Uhrzeit) → identische Ergebnisse.
 * Belohnungen gehören echten Nutzern: Weicht hier etwas ab, ist die neue Fassung falsch – nicht der Test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_EVENTS, BASE_Q } from "@/content/catalog";
import type { Question } from "@/content/schema";
import { addDays } from "@/lib/dates";
import type { State } from "@/lib/state";
import { claimLogin, claimQuest, claimable, evFinal, evInfo, evKap, loginOffer, loginToast, onAnswer, onGuess, openChest, pull, rollDay, titleCheck, applyBoost, type Ctx } from "./core";
import { QPOOL, SKINS } from "./items";
import { lbId, lookOf } from "./lb";
import { firstStart, merge, pack, parseStored, type GState } from "./state";
import { newCtx, oldGami, seeded, stateWith, type Old, type World } from "./golden/harness";

const DAY = "2026-11-14";
const KEY = "tap2coach-gami";
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function world(S: State = stateWith([]), extra: Partial<World> = {}): World { return { S, day: DAY, synced: false, ...extra }; }
function oldWith(raw: string | null, w: World): Old { localStorage.clear(); if (raw != null) localStorage.setItem(KEY, raw); const o = oldGami(w); o.init(); return o; }
function newWith(raw: string | null, w: World): { G: GState; ctx: Ctx & { rec: ReturnType<typeof newCtx>["rec"] } } {
  const G = raw != null ? parseStored(raw) : firstStart(w.S);
  const holder = { G }; const ctx = newCtx(w, () => holder.G);
  return { G, ctx };
}
/** Klick in der alten Ansicht (el.onclick mit data-Attributen wie am Knopf) */
function oldClick(o: Old, el: HTMLElement, dataset: Record<string, string>) { o.view(el); (el.onclick as (e: unknown) => void)({ target: { closest: () => ({ disabled: false, dataset }) } }); }

// ---------- Stände (wie sie bei echten Nutzern vorkommen)
const A = { // fortgeschritten: Titel, Pity, Events, Boosts, Ausrüstung, Spitzname-Zeit
  v: 1, earned: 4321, xp: 50, level: 12, federn: 2345, tickets: 7, combo: 4, best: 23, lastLogin: "2026-11-13", loginClaimed: "2026-11-13", loginStreak: 6, calIdx: 5, calRound: 3,
  today: { day: "2026-11-13", answered: 41, correct: 30, maxCombo: 12, sowi: 3, t2: 20, green: 5, fixed: 2, fresh: 9 }, quests: { ids: ["ans40", "sure25", "combo12", "sowi10", "new15"], claimed: ["ans40"], chest: false },
  owned: { "rabe-party": 1, "rabe-krone": 1, "rabe-visor": 1, "rabe-gold": 1, "rabe-umhang": 1, "katze-diadem": 1, "katze-schleife": 1, "hund-heldenhelm": 1, "rabe-baumshirt": 1, "katze-baumshirt": 1, "pinguin-eiskrone": 1, "maus-laser": 1 },
  equip: { rabe: { hat: "rabe-krone", eye: "rabe-visor", neck: "rabe-umhang", bg: "rabe-gold", shirt: "rabe-baumshirt" }, katze: { hat: "katze-diadem", shirt: "katze-baumshirt" } }, char: "katze", banner: "hund",
  boosts: { xp2: 2, shield: 1 }, xp2Left: 3, shieldOn: true, pity: { rabe: { ssr: 55, sr: 7, guar: true }, hund: { ssr: 79, sr: 9, guar: false } }, hist: ["SR", "N", "R", "SSR", "N"], pulls: 140, tab: "schatz",
  titles: { "hello-world": 1700000000000, junior: 1700000000500, "azb-experte": 1700000001000 }, title: "junior", titleAt: 1700000000600, lookAt: 1700000000700,
  ev: { lf11a: { best: 0.9333, done: 1763100000000, got: 1763100000000, kap: { k1: 1763000000000 } } }, flags: { nacht: 1 },
};
const B = { // kaputt/alt: Zahlen als Text, falsche Daten, fremde IDs, alte Quests, Müll in Listen
  earned: "812", xp: "33.7", level: "0", federn: -5, tickets: "x", combo: "3", best: null, lastLogin: "13.11.2026", loginClaimed: 5, loginStreak: "2", calIdx: "9", calRound: "0",
  today: { day: "2026-11-14", answered: "7", correct: -1, maxCombo: "a" }, quests: { ids: ["alt1", "alt2"], claimed: "x", chest: 1 },
  owned: { "rabe-party": 1, "katze-party": 1, "gibtsnicht": 1, constructor: 1 }, equip: { rabe: { hat: "katze-party", eye: "rabe-gibtsnicht", neck: "rabe-perlen" }, hund: "x", fuchs: { hat: "fuchs-hut" } },
  char: "fuchs", banner: 3, boosts: { xp2: "2", shield: -1 }, xp2Left: "4", shieldOn: "ja", pity: { rabe: { ssr: "12", sr: "x", guar: 1, extra: "bleibt" }, katze: 5, constructor: { ssr: 1 } },
  hist: ["SR", "n", 3, "SSRX", "R"], pulls: "7", tab: "xyz", titles: { kaffee: 1, constructor: 2, unbekannt: 3 }, title: "senior", ev: "kaputt", lookAt: "17",
};
const C = {}; // frisch gespeichert
const D = { earned: 200, level: 3, xp: 20, title: "hello-world", titles: { "hello-world": 1 }, lookAt: 0, equip: { rabe: { hat: "rabe-party" } }, owned: { "rabe-party": 1 } }; // Titel aus v2.6 (ohne titleAt)
const STATES: Record<string, unknown> = { A, B, C, D };
const S_LEARN = stateWith([{ s: 2, n: 60 }, { s: 1, n: 40 }, { s: 0, n: 25 }]);

beforeEach(() => { vi.useFakeTimers({ now: new Date("2026-11-14T10:00:00"), toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] }); localStorage.clear(); document.body.innerHTML = ""; });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Laden und Reparieren (fix)", () => {
  for (const [name, st] of Object.entries(STATES)) it(`Stand ${name}`, () => {
    const raw = JSON.stringify(st), w = world(S_LEARN);
    expect(clone(newWith(raw, w).G)).toEqual(oldWith(raw, w).data());
  });
  it("erster Start: Startbonus aus dem Lernstand", () => {
    for (const S of [stateWith([]), S_LEARN, stateWith([{ s: 2, n: 400 }])]) { const w = world(S); expect(clone(newWith(null, w).G)).toEqual(oldWith(null, w).data()); }
  });
});

describe("Packformat (pack)", () => {
  for (const [name, st] of Object.entries(STATES)) it(`Stand ${name}`, () => {
    const raw = JSON.stringify(st), w = world();
    expect(clone(pack(newWith(raw, w).G))).toEqual(oldWith(raw, w).pack());
  });
});

describe("Zusammenführen (unpack + merge)", () => {
  const w0 = world(S_LEARN);
  const packs: Record<string, unknown> = {};
  for (const [name, st] of Object.entries(STATES)) { const o = oldWith(JSON.stringify(st), w0); packs["pack " + name] = o.pack(); packs["sicherung " + name] = o.data(); }
  Object.assign(packs, {
    "altes Format (v2.5, ohne Titel/Events/Zeit, 4 Slots)": { v: 1, x: 5000, l: 13, p: 10, f: 999, t: 3, o: { rabe: "party.krone.nerd", hund: "cap" }, e: { rabe: "krone.nerd..", hund: "cap..." }, c: "hund", b: [1, 0], y: { rabe: { ssr: 3, sr: 1, guar: false } }, n: 50, s: [3, "2026-11-12", 2, 1, 15] },
    "gleicher Stand ohne Zeitpunkt": { v: 1, x: 4321, l: 12, p: 50, f: 1, t: 0, o: { rabe: "party" }, e: { rabe: "party...." }, c: "rabe", b: [0, 0], y: {}, n: 0, s: [0, null, 0, 1, 0] },
    "jüngere Wahl": { v: 1, x: 10, l: 1, p: 10, f: 0, t: 0, o: { rabe: "party.krone" }, e: { rabe: "party....", katze: "....baumshirt" }, c: "rabe", b: [0, 5], y: {}, n: 0, s: [], a: 1800000000000, ti: "kaffee.senior.unbekannt", tt: "senior", tz: 1800000000000, ev: { lf11a: { best: 1, done: 1763000000000, kap: { k2: 5 } }, wpf: { got: 9 } } },
    "Titel abgelegt": { v: 1, x: 0, ti: "", tt: "", tz: 1900000000000, a: 0 },
    "Müll": { o: { rabe: 123, fuchs: "x" }, e: { fuchs: "a.b", rabe: 7 }, s: "abc", b: "xy", ev: [1], tt: { x: 1 } },
    null: null, text: "kaputt", liste: [1, 2],
  });
  for (const [bn, st] of Object.entries(STATES)) for (const [pn, p] of Object.entries(packs)) it(`${bn} ← ${pn}`, () => {
    const raw = JSON.stringify(st), w = world(S_LEARN);
    const o = oldWith(raw, w); o.merge(clone(p));
    const { G } = newWith(raw, w); merge(G, clone(p));
    expect(clone(G)).toEqual(o.data());
    expect(clone(pack(G))).toEqual(o.pack());
  });
  it("hin und zurück landen beide Geräte beim selben Stand", () => {
    const w = world(S_LEARN), a = newWith(JSON.stringify(A), w).G, d = newWith(JSON.stringify(D), w).G;
    merge(a, pack(d)); merge(d, pack(a)); merge(a, pack(d));
    expect(pack(a)).toEqual(pack(d));
  });
});

// ---------- Antwortfolgen: XP, Serien, Multiplikator, Boosts, Geraten, Tageswechsel, Hinweise
/** Hinweise/Fenster der alten Fassung nach einem Schritt einsammeln (und entfernen) */
function oldFx() {
  vi.advanceTimersByTime(600);
  const toasts = [...document.querySelectorAll(".gm-toast")].map((t) => t.textContent);
  const floats = [...document.querySelectorAll(".gm-float")].map((f) => ({ msg: f.textContent, sure: !f.classList.contains("gm-float-off") }));
  const m = document.querySelector<HTMLElement>(".gm-modal"), h2 = m && !m.hidden ? m.querySelector("h2")?.textContent ?? "" : "";
  document.querySelectorAll(".gm-toast,.gm-float,.gm-confetti").forEach((x) => x.remove()); if (m) m.hidden = true;
  return { toasts, floats, modal: h2 };
}
function newFx(ctx: ReturnType<typeof newWith>["ctx"]) {
  vi.advanceTimersByTime(600);
  const r = ctx.rec, out = { toasts: r.toasts.map((t) => t.text), floats: r.floats.slice(), modal: r.levelUps.length ? `Level ${r.levelUps[r.levelUps.length - 1]}!` : r.evRewards.length ? "ev" : "" };
  r.toasts = []; r.floats = []; r.levelUps = []; r.evRewards = [];
  return out;
}
type Step = { k: "a"; q: Question; ok: boolean; unsure: boolean; f: number; t: number } | { k: "g"; q: Question } | { k: "day" } | { k: "use"; id: string };
function steps(seed: number, n: number): Step[] {
  const r = seeded(seed), out: Step[] = [];
  for (let i = 0; i < n; i++) {
    const x = r();
    if (x < 0.02) out.push({ k: "day" });
    else if (x < 0.04) out.push({ k: "use", id: r() < 0.5 ? "xp2" : "shield" });
    else {
      const q = BASE_Q[Math.floor(r() * BASE_Q.length)], ok = r() < 0.8, unsure = r() < 0.12, f = [-1, 0, 1, 2][Math.floor(r() * 4)], t = [0, 1, 2][Math.floor(r() * 3)];
      out.push({ k: "a", q, ok, unsure, f, t });
      if (ok && r() < 0.1) out.push({ k: "g", q });
    }
  }
  return out;
}
function runOld(raw: string | null, w: World, seq: Step[]) {
  const o = oldWith(raw, w), el = document.createElement("div"), log: unknown[] = [];
  for (const s of seq) {
    if (s.k === "day") w.day = addDays(w.day, 1);
    else if (s.k === "use") oldClick(o, el, { gmUse: s.id });
    else if (s.k === "g") o.guess(s.q);
    else o.answer(s.q, s.ok, s.unsure, s.f, s.t);
    log.push(oldFx());
  }
  return { G: o.data(), log };
}
function runNew(raw: string | null, w: World, seq: Step[]) {
  const { G, ctx } = newWith(raw, w), log: unknown[] = [];
  for (const s of seq) {
    if (s.k === "day") w.day = addDays(w.day, 1);
    else if (s.k === "use") { rollDay(G, w.day); titleCheck(G, ctx); applyBoost(G, ctx, s.id); }
    else if (s.k === "g") onGuess(G, ctx, s.q);
    else onAnswer(G, ctx, s.q, s.ok, s.unsure, s.f, s.t);
    log.push(newFx(ctx));
  }
  return { G: clone(G), log };
}
describe("XP-Berechnung über Antwortfolgen", () => {
  for (const [name, raw, seed] of [["frisch", null, 1], ["fortgeschritten", JSON.stringify(A), 2], ["kaputt", JSON.stringify(B), 3], ["frisch, lang", null, 4]] as const) it(`${name} (Startwert ${seed})`, () => {
    const seq = steps(seed, name.endsWith("lang") ? 600 : 250);
    const t0 = Date.now(), a = runOld(raw, world(S_LEARN), seq);
    vi.setSystemTime(t0); document.body.innerHTML = "";
    const b = runNew(raw, world(S_LEARN), seq);
    expect(b.G).toEqual(a.G);
    expect(b.log).toEqual(a.log);
  });
  it("Nachteule: Antwort zwischen 0 und 4 Uhr", () => {
    vi.setSystemTime(new Date("2026-11-14T02:30:00"));
    const seq: Step[] = [{ k: "a", q: BASE_Q[0], ok: true, unsure: false, f: -1, t: 1 }];
    const a = runOld(null, world(), seq); vi.setSystemTime(new Date("2026-11-14T02:30:00"));
    const b = runNew(null, world(), seq);
    expect(b.G).toEqual(a.G); expect(b.G.titles.nachteule).toBeTruthy();
  });
});

// ---------- Schatzkammer mit fester Zufallsquelle
describe("Gacha (Raten, Soft/Hard-Pity, Highlight-Garantie, Erstattung)", () => {
  const cases: [string, Record<string, unknown>, number[]][] = [
    ["Tickets, dann Federn", { tickets: 12, federn: 20000, banner: "rabe" }, [10, 1, 1, 10, 10, 1]],
    ["Soft-Pity und Garantie", { tickets: 0, federn: 200000, banner: "hund", pity: { hund: { ssr: 58, sr: 3, guar: false } } }, Array(120).fill(1)],
    ["Hard-Pity mit Garantie", { tickets: 0, federn: 99999, banner: "katze", pity: { katze: { ssr: 79, sr: 9, guar: true } } }, [1, 1, 10]],
    ["viele Zehner, Doppelte", { tickets: 0, federn: 500000, banner: "pinguin", owned: Object.fromEntries(SKINS.filter((s) => s.char === "pinguin" && s.rar === "N").map((s) => [s.id, 1])) }, Array(40).fill(10)],
    ["zu wenig", { tickets: 0, federn: 50, banner: "maus" }, [1, 10]],
    ["fortgeschritten", A as Record<string, unknown>, [10, 10, 1, 1]],
  ];
  for (const [name, st, pulls] of cases) for (const seed of [11, 12, 13]) it(`${name} · Startwert ${seed}`, () => {
    const raw = JSON.stringify(st), w = world(S_LEARN), el = document.createElement("div");
    const t0 = Date.now();
    let rnd = seeded(seed); vi.spyOn(Math, "random").mockImplementation(() => rnd());
    const o = oldWith(raw, w); o.view(el);
    for (const n of pulls) (el.onclick as (e: unknown) => void)({ target: { closest: () => ({ disabled: false, dataset: { gmPull: String(n) } }) } });
    const old = o.data();
    vi.setSystemTime(t0); rnd = seeded(seed);
    const { G, ctx } = newWith(raw, w); rollDay(G, w.day); titleCheck(G, ctx);
    for (const n of pulls) pull(G, ctx, n);
    expect(clone(G)).toEqual(old);
  });
});

describe("Tagesquests und Tagestruhe", () => {
  it("gleiche Quests an 400 Tagen", () => {
    for (let i = 0; i < 400; i++) {
      const day = addDays("2026-01-01", i), w = world(stateWith([]), { day }), el = document.createElement("div");
      const o = oldWith("{}", w); o.view(el);
      const { G } = newWith("{}", w); rollDay(G, day);
      expect(G.quests).toEqual(o.data().quests);
    }
  });
  it("abholen, Truhe öffnen, roter Punkt", () => {
    const st = { today: { day: DAY, answered: 50, correct: 40, maxCombo: 25, sowi: 12, t2: 20, green: 9, fixed: 6, fresh: 20 }, loginClaimed: DAY };
    for (let i = 0; i < 30; i++) {
      const day = addDays(DAY, i), w = world(stateWith([]), { day }), raw = JSON.stringify({ ...st, today: { ...st.today, day }, loginClaimed: day }), el = document.createElement("div");
      const t0 = Date.now();
      const o = oldWith(raw, w); o.view(el); const ids: string[] = o.data().quests.ids;
      const dots = [o.hudHTML().includes("gm-dot")];
      for (const id of ids) { oldClick(o, el, { gmClaim: id }); dots.push(o.hudHTML().includes("gm-dot")); }
      oldClick(o, el, { gmClaim: ids[0] }); oldClick(o, el, { gmChest: "" }); oldClick(o, el, { gmChest: "" }); dots.push(o.hudHTML().includes("gm-dot"));
      const old = o.data();
      vi.setSystemTime(t0);
      const { G, ctx } = newWith(raw, w); rollDay(G, day); titleCheck(G, ctx);
      const nd = [claimable(G, day)];
      for (const id of ids) { rollDay(G, day); titleCheck(G, ctx); claimQuest(G, ctx, id); nd.push(claimable(G, day)); }
      claimQuest(G, ctx, ids[0]); openChest(G, ctx); openChest(G, ctx); nd.push(claimable(G, day));
      expect(clone(G)).toEqual(old); expect(nd).toEqual(dots);
      expect(QPOOL.map((q) => q.id)).toEqual(expect.arrayContaining(ids));
    }
  });
});

describe("Login-Kalender", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["erster Login", {}],
    ["Serie läuft weiter", { lastLogin: "2026-11-13", loginClaimed: "2026-11-13", loginStreak: 4, calIdx: 3 }],
    ["Serie gerissen", { lastLogin: "2026-11-10", loginClaimed: "2026-11-10", loginStreak: 5, calIdx: 2, calRound: 2 }],
    ["Boost-Tag", { lastLogin: "2026-11-13", loginStreak: 1, calIdx: 4 }],
    ["Woche geschafft", { lastLogin: "2026-11-13", loginStreak: 6, calIdx: 6, calRound: 3 }],
    ["schon abgeholt", { lastLogin: DAY, loginClaimed: DAY, loginStreak: 2, calIdx: 1 }],
  ];
  for (const [name, st] of cases) it(name, () => {
    const raw = JSON.stringify(st), w = world(), el = document.createElement("div");
    const t0 = Date.now();
    const o = oldWith(raw, w); oldClick(o, el, { gmShowlogin: "" });
    const btn = document.querySelector<HTMLButtonElement>("[data-gm-login]"); const shown = !!btn && !document.querySelector<HTMLElement>(".gm-modal")!.hidden;
    if (btn && shown) btn.click();
    const a = { G: o.data(), fx: oldFx() };
    vi.setSystemTime(t0); document.body.innerHTML = "";
    const { G, ctx } = newWith(raw, w); rollDay(G, DAY); titleCheck(G, ctx);
    const offer = loginOffer(G, DAY);
    if (offer) { claimLogin(G, ctx, offer); ctx.fx.toast(loginToast(offer.r)); }
    const b = { G: clone(G), fx: newFx(ctx) };
    expect(!!offer).toBe(shown);
    expect(b.G).toEqual(a.G);
    expect(b.fx.toasts.slice().sort()).toEqual(a.fx.toasts.slice().sort()); // Reihenfolge: „Woche geschafft“ kommt in beiden 300 ms später
  });
});

describe("Event-Belohnungen", () => {
  const lf = ALL_EVENTS.find((e) => e.id === "lf11a")!, wpf = ALL_EVENTS.find((e) => e.id === "wpf")!;
  for (const e of [lf, wpf]) for (const day of ["2026-11-09", "2026-11-20", "2026-12-18", "2026-12-19"]) it(`${e.id} am ${day}`, () => {
    const w = world(S_LEARN, { day }), t0 = Date.now();
    const o = oldWith(JSON.stringify(A).replace(/"lf11a"/, '"x"'), w);
    const oa = [o.evFinal(e, 10, 15), o.evKap(e, "k1"), o.evKap(e, "k1"), o.evFinal(e, 13, 15), o.evInfo(e), o.evKap(e, "k2"), o.evFinal(e, 15, 15), o.evFinal(e, 0, 0)];
    const old = o.data(), ofx = oldFx();
    vi.setSystemTime(t0); document.body.innerHTML = "";
    const { G, ctx } = newWith(JSON.stringify(A).replace(/"lf11a"/, '"x"'), w);
    const na = [evFinal(G, ctx, e, 10, 15), evKap(G, ctx, e, "k1"), evKap(G, ctx, e, "k1"), evFinal(G, ctx, e, 13, 15), evInfo(G, e), evKap(G, ctx, e, "k2"), evFinal(G, ctx, e, 15, 15), evFinal(G, ctx, e, 0, 0)];
    expect(clone(na)).toEqual(clone(oa));
    expect(clone(G)).toEqual(old);
    expect(newFx(ctx).toasts).toEqual(ofx.toasts);
  });
});

describe("Titel (auch rückwirkend)", () => {
  const S100 = stateWith([{ s: 2, n: 120 }]), Sruns = { ...stateWith([]), runs: [{ at: 1 }] } as unknown as State;
  const cases: [string, Record<string, unknown>, State, Partial<World>, string | null][] = [
    ["Level 30, Serie, Login, Pulls", { earned: 1, level: 30, best: 20, loginStreak: 7, pulls: 100 }, stateWith([]), {}, null],
    ["Sammlung", { owned: Object.fromEntries(SKINS.filter((s) => s.rar !== "S" && s.rar !== "EV").slice(0, 30).map((s) => [s.id, 1])) }, stateWith([]), {}, null],
    ["100 grün", {}, S100, {}, null],
    ["Simulation", {}, Sruns, {}, null],
    ["Sync und Rangliste", {}, stateWith([]), { synced: true }, JSON.stringify({ joined: true, name: "Test" })],
    ["schon vorhanden", { titles: { junior: 5 }, level: 25 }, stateWith([]), {}, null],
  ];
  for (const [name, st, S, ex, lb] of cases) it(name, () => {
    const raw = JSON.stringify(st), w = world(S, ex), el = document.createElement("div"), t0 = Date.now();
    const o = oldWith(raw, w); if (lb) localStorage.setItem("tap2coach-lb", lb); o.view(el); const old = o.data(), ofx = oldFx();
    vi.setSystemTime(t0); document.body.innerHTML = "";
    const { G, ctx } = newWith(raw, w); rollDay(G, DAY); titleCheck(G, ctx);
    expect(clone(G)).toEqual(old); expect(newFx(ctx).toasts).toEqual(ofx.toasts);
  });
});

describe("Rangliste: gleiche ID und gleiches Aussehen", () => {
  for (const synced of [false, true]) it(synced ? "mit Sync-Schlüssel" : "mit Gerätetoken", async () => {
    vi.useRealTimers();
    const calls: { fn: string; a: Record<string, unknown> }[] = [];
    const w = world(stateWith([]), { synced, conf: true, rpc: async (fn, a) => { calls.push({ fn, a }); return { ok: true }; } });
    localStorage.clear(); localStorage.setItem(KEY, JSON.stringify(A)); localStorage.setItem("tap2coach-lb", JSON.stringify({ joined: true, name: "CodeRabe" }));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const o = oldGami(w); o.boot("import=");
    await vi.advanceTimersByTimeAsync(4100);
    vi.useRealTimers();
    for (let i = 0; i < 100 && !calls.some((c) => c.fn === "tap2_lb_top"); i++) await new Promise((r) => setTimeout(r, 10)); // SHA-256 läuft außerhalb der Fake-Timer
    const push = calls.find((c) => c.fn === "tap2_lb_join" || c.fn === "tap2_lb_push")!;
    expect(push).toBeTruthy();
    const { G } = newWith(JSON.stringify(A), w);
    expect(push.a.p_id).toBe(await lbId(synced ? "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2-3456-7890" : null));
    expect(push.a.p_look).toBe(lookOf(G));
    expect(push.a.p_xp).toBe(G.earned); expect(push.a.p_level).toBe(G.level);
  });
});
