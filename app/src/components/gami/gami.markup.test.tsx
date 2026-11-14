// @vitest-environment happy-dom
/**
 * Markup-Golden-Tests: React-Ansichten des Belohnungs-Moduls gegen das Original der Live-App (lib/gami/golden/original.js)
 * bei gleichem Stand und gleichen Klickfolgen – Seite Belohnungen (alle Reiter), Fenster, Hinweise, Rangliste, HUD,
 * Serien-Anzeige, Event-Vorschau. Verglichen wird das DOM (Elemente, Klassen, Texte, Attribute, Styles).
 * Bewusst gleichgesetzt: laufende Figuren-IDs (gm1 …), Firmenfarbe (#08312A → #172033), Link „Spitznamen wählen“
 * (#rangliste → /rangliste, die neue App hat echte Pfade).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { ReactElement } from "react";
import { ALL_EVENTS, BASE_Q } from "@/content/catalog";
import { SKINS } from "@/lib/gami/items";
import { oldGami, seeded, stateWith, type Old, type World } from "@/lib/gami/golden/harness";
import { useProgress } from "@/store/progress";
import { __resetGamiForTests, act, closeModal, gm, lbAct, lbLoad, useGami, type Modal } from "@/store/gami";
import { Belohnungen } from "./Belohnungen";
import { ComboChip, EvPreview, HudPill } from "./Hud";
import { ModalContent } from "./Layer";
import { Rangliste } from "./Rangliste";

const M = vi.hoisted(() => ({ conf: false, rpc: null as null | ((fn: string, a: Record<string, unknown>) => Promise<unknown>) }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children }: { to: string; children: unknown }) => <a href={to}>{children as never}</a> }));
vi.mock("@/lib/supabase", () => ({ get supabase() { return M.conf ? { rpc: async (fn: string, a: Record<string, unknown>) => { try { return { data: await M.rpc!(fn, a), error: null }; } catch (e) { return { data: null, error: { message: String((e as Error).message) } }; } } } : null; } }));

const DAY_REAL = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const KEY = "tap2coach-gami";

// ---------- DOM vergleichbar machen
function canon(n: Node): string {
  if (n.nodeType === 3) return /^\s*$/.test(n.textContent!) ? "" : JSON.stringify(n.textContent);
  if (n.nodeType !== 1) return "";
  const el = n as Element, tag = el.tagName.toLowerCase();
  const attrs = [...el.attributes].map((a) => {
    let v = a.value;
    if (a.name === "class") v = v.split(/\s+/).filter(Boolean).join(" ");
    if (a.name === "style") v = v.split(";").map((x) => x.trim().replace(/\s*:\s*/, ":").replace(/\b0px\b/g, "0")).filter(Boolean).join(";"); // Browser schreiben „0“ als „0px“
    if (a.name === "href" && v === "#rangliste") v = "/rangliste";
    return `${a.name}=${JSON.stringify(v)}`;
  }).sort();
  // Text in Elementen zusammenfassen (React kann Text in mehrere Knoten teilen)
  const kids: string[] = []; let txt = "";
  for (const c of el.childNodes) { if (c.nodeType === 3) { txt += c.textContent; continue; } if (txt && !/^\s*$/.test(txt)) kids.push(JSON.stringify(txt)); txt = ""; const k = canon(c); if (k) kids.push(k); }
  if (txt && !/^\s*$/.test(txt)) kids.push(JSON.stringify(txt));
  return `<${tag} ${attrs.join(" ")}>${kids.join("")}</${tag}>`;
}
const norm = (html: string) => { const d = document.createElement("div"); d.innerHTML = html.replace(/gm\d+/g, "gmN").replace(/#172033/g, "#08312A"); return [...d.childNodes].map(canon).filter(Boolean).join("\n").replace(/></g, ">\n<"); };
/** Wie im Browser rendern (Zustand liefert beim Server-Rendering nur den Anfangszustand) */
const R = (el: ReactElement) => { const d = document.createElement("div"), root = createRoot(d); flushSync(() => root.render(el)); const html = d.innerHTML; root.unmount(); return norm(html); };

// ---------- Prüfstand
function world(extra: Partial<World> = {}): World { return { S: stateWith([{ s: 2, n: 30 }, { s: 1, n: 20 }, { s: 0, n: 10 }]), day: DAY_REAL(), synced: false, ...extra }; }
function setup(raw: string | null, w: World) {
  localStorage.clear(); if (raw != null) localStorage.setItem(KEY, raw);
  useProgress.setState({ S: w.S }); __resetGamiForTests();
}
const oldModal = () => { const m = document.querySelector<HTMLElement>(".gm-modal"); return m && !m.hidden ? norm(m.querySelector(".gm-mbox")!.innerHTML) : ""; };
const newModal = () => { const m = useGami.getState().modal; return m ? R(<ModalContent m={m} />) : ""; };
const oldToasts = () => [...document.querySelectorAll(".gm-toast")].map((t) => t.textContent);
const newToasts = () => useGami.getState().toasts.map((t) => t.text);
function closeOld() { const m = document.querySelector<HTMLElement>(".gm-modal"); if (m && !m.hidden) (m.querySelector("[data-gm-close]") as HTMLElement | null)?.click(); }

beforeEach(() => { vi.useFakeTimers({ now: new Date("2026-11-14T10:00:00"), toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] }); M.conf = false; M.rpc = null; document.body.innerHTML = ""; });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

// ---------- Stände
const ADV = {
  earned: 4321, xp: 50, level: 12, federn: 2345, tickets: 12, combo: 7, best: 23, lastLogin: "2026-11-13", loginClaimed: "2026-11-13", loginStreak: 6, calIdx: 6, calRound: 3,
  owned: { ...Object.fromEntries(SKINS.filter((s) => s.char === "rabe" && s.rar !== "SSR").slice(0, 18).map((s) => [s.id, 1])), "rabe-krone": 1, "katze-baumshirt": 1, "rabe-baumshirt": 1, "hund-heldenhelm": 1 },
  equip: { rabe: { hat: "rabe-krone", shirt: "rabe-baumshirt" }, katze: { shirt: "katze-baumshirt" } }, char: "rabe", banner: "rabe",
  boosts: { xp2: 2, shield: 0 }, xp2Left: 0, shieldOn: true, pity: { rabe: { ssr: 58, sr: 8, guar: true } }, pulls: 99,
  titles: { "hello-world": 1, junior: 2, "azb-experte": 3 }, title: "azb-experte", titleAt: 5, lookAt: 6,
  ev: { lf11a: { best: 0.5, kap: { k1: 1 } } },
};
const STATES: Record<string, unknown> = { frisch: null, fortgeschritten: ADV, "kein Ticket, wenig Federn": { federn: 40, tickets: 0, combo: 1, loginClaimed: "2026-11-14", tab: "garderobe" } };

describe("Seite Belohnungen: alle Reiter, gleicher Stand", () => {
  for (const [name, st] of Object.entries(STATES)) for (const tab of ["quests", "schatz", "garderobe"]) it(`${name} · ${tab}`, () => {
    const raw = st == null ? null : JSON.stringify({ ...st, tab }), w = world(), el = document.createElement("div");
    if (raw == null) { setup(null, w); const o = oldGami(w); o.init(); localStorage.setItem(KEY, JSON.stringify({ ...o.data(), tab })); }
    const r = localStorage.getItem(KEY) ?? raw;
    setup(r, w); const o = oldGami(w); o.view(el); const old = norm(el.innerHTML), oldHud = norm(o.hudHTML()), oldChip = norm(o.chip());
    setup(r, w);
    expect(R(<Belohnungen />)).toBe(old);
    expect(R(<HudPill view="start" />)).toBe(oldHud);
    expect(R(<ComboChip />)).toBe(oldChip);
    expect(gm.data()).toEqual(o.data());
  });
});

describe("Event-Vorschau", () => {
  for (const e of ALL_EVENTS) for (const [name, st] of Object.entries(STATES)) it(`${e.id} · ${name}`, () => {
    const raw = st == null ? null : JSON.stringify(st), w = world();
    setup(raw, w); const o = oldGami(w); o.init(); const old = norm(o.evPreview(e)); const r = localStorage.getItem(KEY);
    setup(r, w); expect(R(<EvPreview e={e} />)).toBe(old);
  });
});

// ---------- Bedienabläufe: nach jedem Schritt Seite, Fenster, Hinweise und Stand vergleichen
type Step = [string, (o: Old, click: (d: Record<string, string>) => void, el: HTMLElement) => void, () => void];
function flow(raw: string, steps: Step[], seed = 7) {
  const w = world(), el = document.createElement("div"); document.body.appendChild(el);
  const t0 = Date.now();
  let rnd = seeded(seed); vi.spyOn(Math, "random").mockImplementation(() => rnd());
  setup(raw, w); const o = oldGami(w); o.view(el);
  const click = (d: Record<string, string>) => (el.onclick as (e: unknown) => void)({ target: { closest: () => ({ disabled: false, dataset: d }) } });
  const olds = steps.map(([, f]) => { f(o, click, el); vi.advanceTimersByTime(1100); o.view(el); const snap = { page: norm(el.innerHTML), modal: oldModal(), toasts: oldToasts(), G: o.data() }; return snap; });
  document.body.innerHTML = ""; vi.setSystemTime(t0); rnd = seeded(seed);
  setup(raw, w); R(<Belohnungen />);
  steps.forEach(([name, , g], i) => {
    g(); vi.advanceTimersByTime(1100);
    const page = R(<Belohnungen />);
    expect({ step: name, page, modal: newModal(), toasts: newToasts(), G: gm.data() }).toEqual({ step: name, ...olds[i] });
  });
}
const oldBtn = (sel: string) => () => (document.querySelector(sel) as HTMLElement).click();

describe("Bedienabläufe Belohnungen", () => {
  it("Quests: Login-Kalender (Woche geschafft), Reiter", () => flow(JSON.stringify({ ...ADV, loginClaimed: "2026-11-13", tab: "quests" }), [
    ["Bonus zeigen", (_o, c) => c({ gmShowlogin: "" }), () => act.showLogin()],
    ["abholen", oldBtn("[data-gm-login]"), () => act.claimLogin((useGami.getState().modal as Extract<Modal, { k: "login" }>).o)],
    ["Reiter Schatzkammer", (_o, c) => c({ gmTab: "schatz" }), () => act.tab("schatz")],
  ]));
  it("Quests abholen und Tagestruhe", () => {
    const day = DAY_REAL(), raw = JSON.stringify({ today: { day, answered: 60, correct: 50, maxCombo: 25, sowi: 12, t2: 20, green: 9, fixed: 6, fresh: 20 }, loginClaimed: day });
    const w = world(); setup(raw, w); const o = oldGami(w); o.view(document.createElement("div")); const ids: string[] = o.data().quests.ids;
    flow(raw, [...ids.map((id) => [`Quest ${id}`, (_o: Old, c: (d: Record<string, string>) => void) => c({ gmClaim: id }), () => act.claim(id)] as Step),
      ["Truhe", (_o, c) => c({ gmChest: "" }), () => act.chest()], ["schließen", closeOld, () => closeModal()]]);
  });
  it("Schatzkammer: Kollektion, 10×, Nochmal, 1×, alle Teile", () => flow(JSON.stringify({ ...ADV, tab: "schatz", federn: 5000 }), [
    ["Kollektion Hund", (_o, c) => c({ gmBanner: "hund" }), () => act.banner("hund")],
    ["10× öffnen", (_o, c) => c({ gmPull: "10" }), () => act.pull(10)],
    ["Nochmal", oldBtn("[data-gm-again]"), () => act.again(10)],
    ["schließen", closeOld, () => closeModal()],
    ["1× öffnen", (_o, c) => c({ gmPull: "1" }), () => act.pull(1)],
    ["schließen", closeOld, () => closeModal()],
    ["alle Teile", (_o, c) => c({ gmInfo: "hund" }), () => act.info("hund")],
  ], 3));
  it("Schatzkammer: Soft-Pity bis Legendär", () => flow(JSON.stringify({ ...ADV, tab: "schatz", tickets: 0, federn: 99999 }), Array.from({ length: 24 }, (_, i) => [`Zug ${i}`, (_o: Old, c: (d: Record<string, string>) => void) => { closeOld(); c({ gmPull: "1" }); }, () => { closeModal(); act.pull(1); }] as Step), 5));
  it("Garderobe: Tier, Anziehen, Titel, Boost", () => flow(JSON.stringify({ ...ADV, tab: "garderobe" }), [
    ["Tier Katze", (_o, c) => c({ gmChar: "katze" }), () => act.char("katze")],
    ["Tier Rabe", (_o, c) => c({ gmChar: "rabe" }), () => act.char("rabe")],
    ["Anziehen", (_o, c) => c({ gmEq: "rabe-party" }), () => act.equip("rabe-party")],
    ["Titel", (_o, c) => c({ gmTitle: "junior" }), () => act.title("junior")],
    ["kein Titel", (_o, c) => c({ gmTitle: "" }), () => act.title("")],
    ["XP-Trank", (_o, c) => c({ gmUse: "xp2" }), () => act.use("xp2")],
  ]));
  it("Lernen: Serie, Level-Up, Event-Belohnung", () => {
    const qs = BASE_Q.slice(0, 14), lf = ALL_EVENTS.find((e) => e.id === "lf11a")!;
    flow(JSON.stringify({ ...ADV, xp: 560, tab: "quests", ev: {} }), [
      ...qs.map((q, i) => [`Antwort ${i}`, (o: Old) => o.answer(q, true, false, -1, 1), () => gm.answer(q, true, false, -1, 1)] as Step),
      ["geraten", (o) => o.guess(qs[13]), () => gm.guess(qs[13])],
      ["schließen", closeOld, () => closeModal()],
      ["Abschlusstest", (o) => o.evFinal(lf, 14, 15), () => gm.evFinal(lf, 14, 15)],
      ["anziehen", oldBtn("[data-gm-evwear]"), () => act.evWear(lf)],
      ["Kapitel", (o) => o.evKap(lf, "k3"), () => gm.evKap(lf, "k3")],
    ]);
  });
});

// ---------- Rangliste
const TOP = (n: number, meAt?: number) => Array.from({ length: n }, (_, i) => ({ r: i + 1, name: i === 1 ? "<b>Böse</b>" : "Spieler" + i, level: 30 - i, xp: 90000 - i * 1234, look: ["rabe:krone.visor.hermelin.gold.baumshirt:junior", "katze:diadem", "fuchs:x", "maus:kaesekrone.laser.goldruestung.kristallhoehle", "pinguin::azb-experte", "hund:heldenhelm.goldbrille:constructor"][i % 6], ...(meAt === i ? { me: true } : {}) }));
const LBS: Record<string, unknown> = {
  "nicht dabei": { top: TOP(6), me: null, total: 6 },
  "dabei, außerhalb der Top": { top: TOP(4), me: { r: 57, name: "CodeRabe", level: 12, xp: 4321, look: "rabe:krone" }, total: 80 },
  "dabei in der Top": { top: TOP(5, 2), me: { r: 3, name: "Spieler2", level: 28, xp: 87532, look: "maus" }, total: 5 },
  leer: { top: [], me: null, total: 0 },
};
const settle = () => new Promise((r) => setTimeout(r, 40));
describe("Rangliste", () => {
  beforeEach(() => { vi.useRealTimers(); });
  it("nicht verfügbar (ohne Server)", () => {
    const w = world(), el = document.createElement("div"); setup(JSON.stringify(ADV), w); const o = oldGami(w); o.rangView(el);
    setup(JSON.stringify(ADV), w); expect(R(<Rangliste />)).toBe(norm(el.innerHTML));
  });
  for (const [name, d] of Object.entries(LBS)) for (const joined of [false, true]) it(`${name} · ${joined ? "eingetragen" : "nicht eingetragen"}`, async () => {
    const lb = joined ? { joined: true, name: "CodeRabe", token: "ab".repeat(20) } : { token: "ab".repeat(20) };
    const rpc = async (fn: string) => (fn === "tap2_lb_top" ? JSON.parse(JSON.stringify(d)) : { ok: true });
    const w = world({ conf: true, rpc }), el = document.createElement("div"); document.body.appendChild(el);
    setup(JSON.stringify(ADV), w); localStorage.setItem("tap2coach-lb", JSON.stringify(lb));
    const o = oldGami(w); o.rangView(el); const loading = norm(el.innerHTML);
    await settle(); o.rangView(el); const loaded = norm(el.innerHTML), lbOld = localStorage.getItem("tap2coach-lb");
    document.body.innerHTML = ""; M.conf = true; M.rpc = rpc;
    setup(JSON.stringify(ADV), w); localStorage.setItem("tap2coach-lb", JSON.stringify(lb));
    expect(R(<Rangliste />)).toBe(loading);
    await lbLoad(true); await settle();
    expect(R(<Rangliste />)).toBe(loaded);
    expect(localStorage.getItem("tap2coach-lb")).toBe(lbOld);
  });
  it("Fehler, Austragen-Rückfrage, Namen ändern", async () => {
    const lb = { joined: true, name: "CodeRabe", token: "cd".repeat(20) }, d = LBS["dabei, außerhalb der Top"];
    const bad = async () => { throw new Error("weg"); }, good = async (fn: string) => (fn === "tap2_lb_top" ? JSON.parse(JSON.stringify(d)) : { ok: true });
    const w = world({ conf: true, rpc: bad }), el = document.createElement("div"); document.body.appendChild(el);
    setup(JSON.stringify(ADV), w); localStorage.setItem("tap2coach-lb", JSON.stringify(lb));
    const o = oldGami(w); o.rangView(el); await settle(); o.rangView(el); const errOld = norm(el.innerHTML);
    M.conf = true; M.rpc = bad; document.body.innerHTML = "";
    setup(JSON.stringify(ADV), w); localStorage.setItem("tap2coach-lb", JSON.stringify(lb));
    await lbLoad(true); expect(R(<Rangliste />)).toBe(errOld);
    // mit geladener Liste
    w.rpc = good; setup(JSON.stringify(ADV), w); localStorage.setItem("tap2coach-lb", JSON.stringify(lb));
    const o2 = oldGami(w), el2 = document.createElement("div"); document.body.appendChild(el2); o2.rangView(el2); await settle(); o2.rangView(el2);
    (el2.querySelector("[data-gm-lbleave]") as HTMLElement).click(); const askOld = norm(el2.innerHTML);
    (el2.querySelector("[data-gm-lbedit]") as HTMLElement).click(); o2.rangView(el2); const editOld = norm(el2.innerHTML);
    (el2.querySelector("[data-gm-lbcancel]") as HTMLElement).click(); o2.rangView(el2); const cancelOld = norm(el2.innerHTML);
    M.rpc = good; document.body.innerHTML = ""; setup(JSON.stringify(ADV), w); localStorage.setItem("tap2coach-lb", JSON.stringify(lb));
    await lbLoad(true);
    lbAct.leaveAsk(); expect(R(<Rangliste />)).toBe(askOld);
    lbAct.edit(); expect(R(<Rangliste />)).toBe(editOld);
    lbAct.cancel(); expect(R(<Rangliste />)).toBe(cancelOld);
  });
});
