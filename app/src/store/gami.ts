/**
 * Belohnungen (XP, Level, Quests, Login-Kalender, Schatzkammer, Garderobe, Titel, Event-Belohnungen, Bestenliste) –
 * Laufzeit wie das Belohnungs-Modul der Live-App: eigener Speicher tap2coach-gami (Lernstand wird hier nur gelesen),
 * Fenster und Hinweise (Ebene .gm-modal/.gm-toasts), Abgleich mit Sync und Rangliste.
 * Regeln: src/lib/gami (mit Golden-Tests gegen das Original). Fehler hier stören das Lernen nie (safe()).
 *
 * Der Stand G ist – wie im Original – ein veränderliches Objekt; nach jeder Änderung zählt `n` hoch und React zeichnet neu.
 */
import { create } from "zustand";
import type { EventCatalog, Question } from "@/content/schema";
import { today } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { claimable, claimLogin, claimQuest, chipText, equip, evFinal as evFinalCore, evInfo as evInfoCore, evKap as evKapCore, evWear, loginOffer, loginToast, onAnswer, onGuess, onTutor, openChest, pull, rollDay, setTitle, titleCheck, applyBoost, type Ctx, type LoginOffer, type PullResult } from "@/lib/gami/core";
import { KEY_GAMI } from "@/lib/gami/items";
import { NAME_RE, lbGet, lbId, lbSet, lookOf, type LbData } from "@/lib/gami/lb";
import { firstStart, merge as mergeCore, pack as packCore, parseStored, type GState } from "@/lib/gami/state";
import { useProgress } from "./progress";

export type Modal =
  | { k: "level"; l: number }
  | { k: "login"; o: LoginOffer }
  | { k: "chest" }
  | { k: "pullOpen"; n: number; top: string }
  | { k: "pull"; r: PullResult; again: boolean }
  | { k: "info"; c: string }
  | { k: "ev"; e: EventCatalog; up: number; l: number };
type Toast = { id: number; text: string };
/** Bestenliste (LB der Live-App) */
export type Lb = { data: LbData | null; at: number; busy: boolean; err: string; edit: boolean; leave: boolean };

export const useGami = create<{ n: number; modal: Modal | null; layer: boolean; toasts: Toast[]; lb: Lb }>(() => ({
  n: 0, modal: null, layer: false, toasts: [], lb: { data: null, at: 0, busy: false, err: "", edit: false, leave: false },
}));
const bump = () => useGami.setState((s) => ({ n: s.n + 1 }));
const lbSetState = (p: Partial<Lb>) => useGami.setState((s) => ({ lb: { ...s.lb, ...p } }));
const LBX = { timer: 0 as ReturnType<typeof setTimeout> | 0, away: true }; // nicht angezeigt

/** Sync-Anbindung (store/livesync.ts meldet sich hier an – vermeidet einen Import-Kreis) */
type SyncHooks = { get: () => { key: string } | null; soon: (ms?: number) => void };
let SYNC: SyncHooks = { get: () => null, soon: () => {} };
export const connectGamiSync = (h: SyncHooks) => { SYNC = h; };
const syncConf = () => !!supabase;

// ---- Ansicht und Lernrunde der App (für den Login-Kalender beim Start und das Neuzeichnen)
let current: { view: string; sess: unknown; run: unknown } = { view: "start", sess: null, run: null };
export const setGamiContext = (view: string, ui: { sess?: unknown; run?: unknown }) => { current = { view, sess: ui.sess ?? null, run: ui.run ?? null }; };

// ---- Stand
let G: GState | null = null;
const save = () => { try { localStorage.setItem(KEY_GAMI, JSON.stringify(G)); } catch { /* privat */ } };
function load(): GState {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY_GAMI); } catch { /* privat */ }
  if (raw) {
    try { return parseStored(raw); }
    catch { try { localStorage.setItem(KEY_GAMI + "-defekt", raw); } catch { /* nichts wegwerfen */ } }
  }
  G = firstStart(useProgress.getState().S); save(); // Erster Start: Startbonus aus dem bisherigen Lernstand
  return G;
}
/** Stand (beim ersten Zugriff geladen) */
export const gami = (): GState => (G ??= load());

// ---- Effekte (Zeiten wie in der Live-App)
let tid = 0;
function toast(text: string) {
  const id = ++tid;
  useGami.setState((s) => ({ layer: true, toasts: [...s.toasts, { id, text }] }));
  setTimeout(() => useGami.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
}
export function openModal(m: Modal) { useGami.setState({ modal: m, layer: true }); }
export function closeModal() { useGami.setState({ modal: null }); bump(); }
function confetti(n = 50) {
  if (typeof window.matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cols = ["#6AD2E2", "#FFD03D", "#E2468A", "#928BDE", "#3B8CF0", "#1EAD1B"];
  for (let i = 0; i < n; i++) { const c = document.createElement("div"); c.className = "gm-confetti"; c.style.left = Math.random() * 100 + "vw"; c.style.background = cols[i % cols.length]; c.style.animationDelay = Math.random() * 0.4 + "s"; document.body.appendChild(c); setTimeout(() => c.remove(), 2600); }
}
const ctx: Ctx = {
  S: () => useProgress.getState().S, today, synced: () => !!SYNC.get(), lbJoined: () => !!lbGet().joined, rt: { last: null },
  fx: {
    save,
    toast: (text, delay) => { if (delay) setTimeout(() => toast(text), delay); else toast(text); },
    levelUp: () => setTimeout(() => { confetti(); openModal({ k: "level", l: gami().level }); }, 500),
    float: (msg, sure) => setTimeout(() => { useGami.setState({ layer: true }); const fl = document.createElement("div"); fl.className = "gm-float" + (sure ? "" : " gm-float-off"); fl.textContent = msg; document.body.appendChild(fl); setTimeout(() => fl.remove(), 1200); }, 30),
    confetti,
    evReward: (e, up) => setTimeout(() => { confetti(70); openModal({ k: "ev", e, up, l: gami().level }); }, 400),
    lbSoon: (ms) => lbSoon(ms), syncSoon: (ms) => { try { SYNC.soon(ms); } catch { /* Sync nie wichtiger als Belohnungen */ } },
  },
};
/** Abgesichert wie gm() der Live-App: Fehler im Belohnungs-Teil stören das Lernen nie */
function safe<T>(f: () => T): T | undefined { try { return f(); } catch (e) { console.error(e); return undefined; } }

// ---- Anbindung an die App (wie die Schnittstelle des Moduls in der Live-App)
export const gm = {
  answer: (q: Pick<Question, "id" | "topic">, ok: boolean, unsure: boolean, f: number, t: number) => safe(() => { onAnswer(gami(), ctx, q, ok, unsure, f, t); bump(); }),
  guess: (q: Pick<Question, "id" | "topic">) => safe(() => { onGuess(gami(), ctx, q); bump(); }),
  /** Tutor-Aufgabe bewertet: Quests/Serie wie eine Antwort, XP nach Punkten (gedeckelt). Gibt die vergebenen XP zurück. */
  tutor: (q: Pick<Question, "id" | "topic">, punkte: number, max: number, unsure: boolean, xp: number, cap: number) => safe(() => { const r = onTutor(gami(), ctx, q, punkte, max, unsure, xp, cap); bump(); return r; }) ?? 0,
  chip: () => safe(() => chipText(gami())) ?? "",
  pack: () => safe(() => packCore(gami())) ?? null,
  merge: (p: unknown) => safe(() => { if (mergeCore(gami(), p)) { save(); bump(); } }),
  data: () => safe(() => JSON.parse(JSON.stringify(gami())) as GState),
  evInfo: (e: EventCatalog) => safe(() => evInfoCore(gami(), e)) ?? {},
  evFinal: (e: EventCatalog, sure: number, n: number) => safe(() => { const r = evFinalCore(gami(), ctx, e, sure, n); bump(); return r; }),
  evKap: (e: EventCatalog, kid: string) => safe(() => { const r = evKapCore(gami(), ctx, e, kid); bump(); return r; }),
  claimable: () => safe(() => claimable(gami(), today())) ?? false,
  /** Start: Tag weiterschalten, Titel prüfen, Rangliste nachziehen, Login-Kalender zeigen (nicht über Übertragen/Verbinden, Tutorial, Runde, Prüfung) */
  boot: (h: string) => safe(() => {
    const g = gami(); rollDay(g, today()); titleCheck(g, ctx); save();
    if (lbGet().joined) setTimeout(() => void lbPush(), 4000); else if (SYNC.get() && syncConf()) setTimeout(() => void lbLoad(true), 5000);
    const free = () => current.view !== "tutorial" && !current.sess && !current.run;
    if (!h.startsWith("import=") && free() && g.loginClaimed !== today()) setTimeout(() => { if (free()) showLogin(); }, 700);
    bump();
  }),
};

// ---- Bedienung der Seite Belohnungen (Klick-Handler von viewHTML der Live-App)
const after = (lbMs: number) => { ctx.fx.syncSoon(3000); lbSoon(lbMs); }; // Belohnungen auch ohne Lernen abgleichen
/** Seite Belohnungen wird gezeichnet: Tag weiterschalten, Titel prüfen (wie viewHTML) */
export const viewPrep = () => safe(() => { const g = gami(); rollDay(g, today()); titleCheck(g, ctx); });
export const act = {
  tab: (k: string) => safe(() => { gami().tab = k; save(); bump(); }),
  claim: (id: string) => safe(() => { if (claimQuest(gami(), ctx, id)) { bump(); after(30000); } }),
  chest: () => safe(() => { if (openChest(gami(), ctx)) { openModal({ k: "chest" }); after(30000); } }),
  showLogin: () => safe(showLogin),
  claimLogin: (o: LoginOffer) => safe(() => { if (!claimLogin(gami(), ctx, o)) return closeModal(); closeModal(); toast(loginToast(o.r)); }),
  pull: (n: number) => safe(() => { doPull(n); after(30000); }),
  again: (n: number) => safe(() => doPull(n)),
  info: (c: string) => safe(() => openModal({ k: "info", c })),
  banner: (c: string) => safe(() => { gami().banner = c; save(); bump(); }),
  char: (c: string) => safe(() => { const g = gami(); g.char = c; g.lookAt = Date.now(); save(); bump(); after(5000); }),
  equip: (id: string) => safe(() => { if (equip(gami(), id)) { save(); bump(); after(5000); } }),
  title: (id: string) => safe(() => { if (setTitle(gami(), id)) { save(); bump(); after(5000); } }),
  use: (id: string) => safe(() => { if (applyBoost(gami(), ctx, id)) { bump(); after(30000); } }),
  evWear: (e: EventCatalog) => safe(() => { evWear(gami(), e); save(); lbSoon(3000); ctx.fx.syncSoon(3000); closeModal(); }),
};
function showLogin() { const o = loginOffer(gami(), today()); if (o) openModal({ k: "login", o }); }
function doPull(n: number) {
  const g = gami(), r = pull(g, ctx, n); if (!r) return;
  openModal({ k: "pullOpen", n, top: r.top }); bump();
  setTimeout(() => { if (r.top === "SSR") confetti(90); openModal({ k: "pull", r, again: g.tickets >= n || g.federn >= r.cost }); }, 1000);
}

// ---- Bestenliste (freiwillig): sichtbar sind nur Spitzname, Level, XP, Figur und Titel. Server: tools/supabase-leaderboard.sql
async function rpc(fn: string, args: Record<string, unknown>) {
  if (!supabase) throw new Error("Server nicht eingerichtet");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(String(error.message).slice(0, 160));
  return data as Record<string, unknown> | null;
}
const LB = () => useGami.getState().lb;
const myId = () => lbId(SYNC.get()?.key);
export async function lbLoad(force?: boolean) {
  if (!syncConf() || (!force && Date.now() - LB().at < 60000)) return;
  lbSetState({ at: Date.now() });
  try {
    const id = await myId(), d = (await rpc("tap2_lb_top", { p_limit: 100, p_id: id })) as LbData | null, lb = lbGet();
    const data = d && Array.isArray(d.top) ? d : { top: [], me: null, total: 0 };
    lbSetState(force ? { data } : { data, err: "" });
    if (data.me && (!lb.joined || lb.id !== id)) { Object.assign(lb, { joined: true, id, name: data.me.name }); lbSet(lb); bump(); return; } // ein verbundenes Gerät ist schon eingetragen
    if (!data.me && lb.joined) { if (lb.id && lb.id !== id && lb.name) { void lbJoin(lb.name); return; } lb.joined = false; lbSet(lb); bump(); return; } // Sync-Gruppe gewechselt → Eintrag mitnehmen; sonst gelöscht
  } catch { if (!LB().data) lbSetState({ err: "Die Bestenliste ist gerade nicht erreichbar." }); }
  bump();
}
export async function lbJoin(nameIn: unknown) {
  const name = String(nameIn || "").trim();
  if (!NAME_RE.test(name)) { lbSetState({ err: "3–16 Zeichen: Buchstaben, Ziffern, _ . -" }); return bump(); }
  lbSetState({ busy: true, err: "" }); bump();
  try {
    const id = await myId(), lb = lbGet(), g = gami();
    if (lb.id && lb.id !== id) { try { await rpc("tap2_lb_leave", { p_id: lb.id }); } catch { /* alten Eintrag nicht doppelt stehen lassen */ } }
    const r = await rpc("tap2_lb_join", { p_id: id, p_name: name, p_xp: g.earned, p_level: g.level, p_look: lookOf(g) });
    if (!r || !r.ok) { lbSetState({ err: r && r.err === "vergeben" ? "Der Name ist schon vergeben." : "Dieser Name geht nicht. 3–16 Zeichen: Buchstaben, Ziffern, _ . -" }); if (lb.joined && lb.id !== id) { lb.joined = false; delete lb.id; lbSet(lb); } }
    else { Object.assign(lb, { id, name, joined: true }); lbSet(lb); lbSetState({ edit: false }); }
  } catch { lbSetState({ err: "Gerade nicht erreichbar. Versuche es später noch einmal." }); }
  lbSetState({ busy: false, at: 0 }); await lbLoad(true); bump();
}
export async function lbLeave() {
  const lb = lbGet(); lbSetState({ busy: true }); bump();
  try { if (lb.id) await rpc("tap2_lb_leave", { p_id: lb.id }); lb.joined = false; delete lb.id; lbSet(lb); lbSetState({ err: "" }); }
  catch { lbSetState({ err: "Austragen gerade nicht möglich. Versuche es später noch einmal." }); }
  lbSetState({ busy: false, leave: false, at: 0 }); await lbLoad(true); bump();
}
async function lbPush() {
  LBX.timer = 0; const lb = lbGet(); if (!lb.joined || !syncConf() || navigator.onLine === false) return;
  try {
    const id = await myId(); if (lb.id !== id) return lbJoin(lb.name);
    const g = gami(), r = await rpc("tap2_lb_push", { p_id: id, p_xp: g.earned, p_level: g.level, p_look: lookOf(g) });
    if (r && r.gone) { lb.joined = false; lbSet(lb); }
    else if (r && r.later) lbSoon(20000);
    lbSetState({ at: 0 });
  } catch { /* nächstes Mal */ }
}
function lbSoon(ms?: number) { if (!lbGet().joined) return; if (LBX.timer) clearTimeout(LBX.timer); LBX.timer = setTimeout(() => void lbPush(), ms == null ? 30000 : ms); }
export const lbAct = {
  edit: () => { lbSetState({ edit: true, err: "" }); bump(); },
  cancel: () => { lbSetState({ edit: false, err: "" }); bump(); },
  leaveAsk: () => { lbSetState({ leave: true }); },
  leave: () => void lbLeave(),
  join: (name: string) => void lbJoin(name),
};
/** HUD: außerhalb der Rangliste merken, dass sie beim nächsten Aufruf frisch geladen wird */
export const lbMarkAway = () => { LBX.away = true; };
/** Rangliste wird gezeichnet: beim Aufruf über das Menü frisch laden, beim Neuzeichnen nur, wenn älter als 1 Minute */
export const lbOnRender = () => { const fresh = LBX.away; LBX.away = false; setTimeout(() => void lbLoad(fresh || Date.now() - LB().at > 60000), 0); };

if (typeof window !== "undefined") {
  // Anderer Tab hat Belohnungen gespeichert: übernehmen
  window.addEventListener("storage", (e) => { if (e.key === KEY_GAMI && e.newValue) { try { G = parseStored(e.newValue); bump(); } catch { /* kaputt: eigenen Stand behalten */ } } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && LBX.timer) { clearTimeout(LBX.timer); void lbPush(); } });
}

/** Nur für Tests: Laufzeit zurücksetzen (Stand wird beim nächsten Zugriff neu geladen) */
export function __resetGamiForTests() {
  G = null; ctx.rt.last = null; LBX.timer = 0; LBX.away = true;
  useGami.setState({ n: 0, modal: null, layer: false, toasts: [], lb: { data: null, at: 0, busy: false, err: "", edit: false, leave: false } });
}
