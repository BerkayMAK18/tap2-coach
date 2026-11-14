/**
 * Belohnungs-Zustand (Speicher tap2coach-gami) – 1:1 wie in der Live-App: frischer Stand, Reparatur nach dem Laden
 * (fix), erster Start mit Startbonus, kompaktes Format für Sync/Übertragung (pack/unpack) und Zusammenführen (merge).
 * Format und Regeln unverändert: Sync mit der Live-App und die Rangliste tap2_lb hängen daran (docs/MIGRATION.md).
 * Funktionen arbeiten direkt auf dem übergebenen Stand G (wie das Original), ohne Speicher oder Oberfläche.
 */
import { dayStr, isObj, mapObj, num, plain, type State } from "@/lib/state";
import { ANIMALS, CHARS } from "./art";
import { IT, QPOOL, SKINS, SLOTS, baseEquip, need, type Equip, type Today } from "./items";
import { TI } from "./titles";

export type Pity = { ssr: number; sr: number; guar: boolean; [k: string]: unknown };
export type EvRec = { best?: number; done?: number; got?: number; kap?: Record<string, number>; [k: string]: unknown };
export type Quests = { ids: string[]; claimed: string[]; chest: boolean };
export type GState = {
  v: number; earned: number; xp: number; level: number; federn: number; tickets: number; combo: number; best: number;
  lastLogin: string | null; loginClaimed: string | null; loginStreak: number; calIdx: number; calRound: number;
  today: Today | null; quests: Quests | null; owned: Record<string, number>; equip: Record<string, Equip>; char: string; banner: string;
  boosts: { xp2: number; shield: number }; xp2Left: number; shieldOn: boolean; pity: Record<string, Pity>; hist: string[]; pulls: number; tab: string;
  titles: Record<string, number>; title?: string; titleAt?: number; lookAt?: number; ev: Record<string, EvRec>; flags?: Record<string, number>;
  [k: string]: unknown;
};
type Loose = Record<string, unknown>;

// G.lookAt (erst beim ersten Wechsel gesetzt): Zeitpunkt der letzten Wahl von Figur/Ausrüstung, für den Abgleich zwischen Geräten
export const fresh = (): GState => ({ v: 1, earned: 0, xp: 0, level: 1, federn: 300, tickets: 1, combo: 0, best: 0, lastLogin: null, loginClaimed: null, loginStreak: 0, calIdx: 0, calRound: 1, today: null, quests: null, owned: {}, equip: {}, char: "rabe", banner: "rabe", boosts: { xp2: 0, shield: 0 }, xp2Left: 0, shieldOn: false, pity: {}, hist: [], pulls: 0, tab: "quests" }) as unknown as GState;

/** Stand nach dem Laden (Speicher, Link, Sicherung, Sync) auf gültige Werte bringen – nichts Gültiges wird verworfen */
export function fix(G: GState) {
  const g = G as Loose;
  if (!G.owned || typeof G.owned !== "object") G.owned = {};
  SKINS.filter((i) => i.rar === "S").forEach((i) => { G.owned[i.id] = 1; });
  G.equip = G.equip || {};
  CHARS.forEach((c) => { const e = G.equip[c] = Object.assign(baseEquip(c), G.equip[c] || {}); SLOTS.forEach(([sl]) => { if (!IT[e[sl]] || !G.owned[e[sl]] || IT[e[sl]]!.char !== c) e[sl] = baseEquip(c)[sl]; }); });
  if (!ANIMALS[G.char]) G.char = "rabe"; if (!ANIMALS[G.banner]) G.banner = "rabe";
  if (!G.titles || typeof G.titles !== "object") G.titles = {}; if (!G.ev || typeof G.ev !== "object") G.ev = {}; if (G.title && (!TI[G.title] || !G.titles[G.title])) G.title = "";
  if (G.title && !G.titleAt) G.titleAt = +(G.lookAt as number) || 1; // Titel aus v2.6/2.7 (ohne eigenen Zeitpunkt): gilt ab seiner letzten Wahl
  G.boosts = Object.assign({ xp2: 0, shield: 0 }, G.boosts || {}); G.pity = G.pity || {}; G.hist = Array.isArray(G.hist) ? G.hist : [];
  if (G.quests && (!Array.isArray(G.quests.ids) || !G.quests.ids.every((id) => QPOOL.some((q) => q.id === id)))) G.quests = null; // alte Quests → neu würfeln, Tageszähler bleiben
  ["earned", "xp", "level", "federn", "tickets", "pulls"].forEach((k) => { g[k] = Math.max(k === "level" ? 1 : 0, Math.floor(+(g[k] as number) || 0)); });
  // Felder, die angezeigt werden, auf ihren Typ zwingen (Belohnungen können aus Link, Sicherung oder Sync kommen)
  ["combo", "best", "loginStreak", "calIdx", "xp2Left"].forEach((k) => { g[k] = Math.max(0, Math.floor(num(g[k]))); });
  G.calRound = Math.max(1, Math.floor(num(G.calRound, 1)));
  ["lastLogin", "loginClaimed"].forEach((k) => { if (g[k] != null && !dayStr(g[k])) g[k] = null; });
  if (G.today != null && (!isObj(G.today) || !dayStr(G.today.day))) G.today = null;
  if (G.today) { const t = G.today as Loose; Object.keys(t).forEach((k) => { if (k !== "day") t[k] = Math.max(0, num(t[k])); }); }
  G.boosts = { xp2: Math.max(0, num(G.boosts.xp2)), shield: Math.max(0, num(G.boosts.shield)) }; G.shieldOn = !!G.shieldOn;
  G.pity = mapObj(G.pity, (p) => (isObj(p) ? Object.assign(plain(p), { ssr: Math.max(0, num(p.ssr)), sr: Math.max(0, num(p.sr)), guar: !!p.guar }) as Pity : null)); // pro Tier: { ssr, sr, guar }
  G.hist = G.hist.filter((r) => typeof r === "string" && /^[A-Z]{1,4}$/.test(r)).slice(0, 60);
  if (G.quests) { G.quests.chest = !!G.quests.chest; if (!Array.isArray(G.quests.claimed)) G.quests.claimed = []; }
  if (!["quests", "schatz", "garderobe"].includes(G.tab)) G.tab = "quests";
  ["lookAt", "titleAt"].forEach((k) => { if (g[k] != null) g[k] = num(g[k]); });
}

/** Gespeicherten Stand lesen (wirft bei kaputtem JSON – dann legt der Aufrufer ihn unter „-defekt“ ab) */
export function parseStored(raw: string): GState { const G = Object.assign(fresh(), JSON.parse(raw)) as GState; fix(G); return G; }
/** Erster Start: Startbonus aus dem bisherigen Lernstand (einmalig, ohne Popups) */
export function firstStart(S: State): GState {
  const G = fresh(); fix(G);
  const q = Object.values(S.q || {}) as { s?: number }[], bonus = q.reduce((a, r) => a + (r.s === 2 ? 10 : r.s === 1 ? 5 : r.s === 0 ? 2 : 0), 0);
  G.earned = bonus; G.xp = bonus; while (G.xp >= need(G.level)) { G.xp -= need(G.level); G.level++; }
  G.federn += (G.level - 1) * 100; G.tickets += Math.floor(G.level / 5);
  return G;
}

// ---- Übertragung und Sicherung: zusammenführen, nie verlieren
export type Packed = { v: 1; x: number; l: number; p: number; f: number; t: number; o: Record<string, string>; e: Record<string, string>; c: string; b: [number, number]; y: Record<string, Pity>; n: number; s: [number, string | null, number, number, number]; a: number; ti: string; tt: string; tz: number; ev: Record<string, EvRec> };
export function pack(G: GState): Packed {
  const own: Record<string, string[]> = {}; Object.keys(G.owned).forEach((id) => { const it = IT[id]; if (it && it.rar !== "S") (own[it.char!] = own[it.char!] || []).push(it.art!); });
  const eq: Record<string, string> = {}; CHARS.forEach((c) => { eq[c] = SLOTS.map(([s]) => (IT[G.equip[c][s]] || { art: "" }).art || "").join("."); });
  return { v: 1, x: G.earned, l: G.level, p: G.xp, f: G.federn, t: G.tickets, o: Object.fromEntries(Object.entries(own).map(([c, l]) => [c, l.join(".")])), e: eq, c: G.char, b: [G.boosts.xp2, G.boosts.shield], y: G.pity, n: G.pulls, s: [G.loginStreak, G.lastLogin, G.calIdx, G.calRound, G.best], a: G.lookAt || 0, ti: Object.keys(G.titles || {}).filter((id) => TI[id]).join("."), tt: G.title || "", tz: G.titleAt || 0, ev: G.ev || {} };
}
/** Kompaktes Format (oder ganze Sicherung) → Stand. Ungültiges wird weggelassen, nie geraten. */
export function unpack(p: unknown): GState | null {
  if (!p || typeof p !== "object") return null;
  const P = p as Loose;
  if (P.owned) return Object.assign(fresh(), plain(p)) as GState; // ganze Sicherung (fix() prüft danach alle Felder)
  const g = fresh() as GState & Loose, s = (P.s || []) as unknown[], b = (P.b || []) as unknown[];
  const n = (v: unknown) => +(v as number);
  Object.assign(g, { earned: n(P.x) || 0, level: n(P.l) || 1, xp: n(P.p) || 0, federn: n(P.f) || 0, tickets: n(P.t) || 0, char: P.c || "rabe", pity: P.y || {}, pulls: n(P.n) || 0, loginStreak: n(s[0]) || 0, lastLogin: s[1] || null, calIdx: n(s[2]) || 0, calRound: n(s[3]) || 1, best: n(s[4]) || 0 });
  g.boosts = { xp2: n(b[0]) || 0, shield: n(b[1]) || 0 }; if (n(P.a)) g.lookAt = n(P.a);
  g.titles = {}; String(P.ti || "").split(".").forEach((id) => { if (TI[id]) g.titles[id] = 1; }); if (P.tt != null) g.title = TI[P.tt as string] ? String(P.tt) : ""; if (n(P.tz)) g.titleAt = n(P.tz); else if (P.tt) g.titleAt = n(P.a) || 0; g.ev = (P.ev && typeof P.ev === "object" ? P.ev : {}) as Record<string, EvRec>;
  Object.entries((P.o || {}) as Loose).forEach(([c, l]) => String(l).split(".").forEach((a) => { if (IT[c + "-" + a]) g.owned[c + "-" + a] = 1; }));
  Object.entries((P.e || {}) as Loose).forEach(([c, l]) => { if (!ANIMALS[c]) return; const arts = String(l).split("."); g.equip[c] = baseEquip(c); SLOTS.forEach(([sl], i) => { if (i >= arts.length) { delete g.equip[c][sl]; return; } const id = c + "-" + arts[i]; if (arts[i] && IT[id] && IT[id]!.slot === sl) g.equip[c][sl] = id; }); });
  return g;
}
/** Fremden Stand einmischen: Besitz/Titel/Events vereinigen, Fortschritt vom weiter fortgeschrittenen Stand, Aussehen von der jüngsten Wahl */
export function merge(G: GState, p: unknown) {
  const inc = unpack(p); if (!inc) return false;
  const I = inc as GState & Loose, M = G as GState & Loose;
  Object.keys(inc.owned || {}).forEach((id) => { if (IT[id]) G.owned[id] = 1; });
  Object.keys(inc.titles || {}).forEach((id) => { if (TI[id] && !G.titles[id]) G.titles[id] = +inc.titles[id] || 1; }); // Titel: Vereinigung
  Object.entries(inc.ev || {}).forEach(([k, r]) => { if (!r || typeof r !== "object") return; const m = G.ev[k] = G.ev[k] || {}; m.best = Math.max(+(m.best as number) || 0, +(r.best as number) || 0); (["done", "got"] as const).forEach((f) => { if (+(r[f] as number) && (!+(m[f] as number) || +(r[f] as number) < +(m[f] as number))) m[f] = +(r[f] as number); }); m.kap = Object.assign({}, r.kap || {}, m.kap || {}); }); // Events: nie verlieren
  G.boosts.xp2 = Math.max(G.boosts.xp2, +inc.boosts.xp2 || 0); G.boosts.shield = Math.max(G.boosts.shield, +inc.boosts.shield || 0);
  if (inc.title !== undefined && (+(inc.titleAt as number) || 0) > (+(G.titleAt as number) || 0) && (!inc.title || G.titles[inc.title])) { G.title = inc.title; G.titleAt = +(inc.titleAt as number); } // Titel: die zuletzt getroffene Wahl
  const ahead = (+inc.earned || 0) > G.earned, tie = (+inc.earned || 0) === G.earned, incA = +(inc.lookAt as number) || 0, myA = +(G.lookAt as number) || 0;
  const lookKey = (g: GState) => g.char + "|" + CHARS.map((c) => SLOTS.map(([s]) => ((g.equip || {})[c] || {})[s] || "").join(",")).join(";");
  if (ahead) { // Fortschritt: der weiter fortgeschrittene Stand
    ["earned", "xp", "level", "federn", "tickets", "pulls", "best", "loginStreak", "lastLogin", "calIdx", "calRound"].forEach((k) => { if (I[k] != null) M[k] = I[k]; });
    if (inc.pity) G.pity = inc.pity;
  }
  if (incA > myA) { // Figur + Ausrüstung: die zuletzt getroffene Wahl gilt auf allen Geräten
    if (inc.char && ANIMALS[inc.char]) G.char = inc.char;
    CHARS.forEach((c) => { const ie = inc.equip && inc.equip[c]; if (ie) SLOTS.forEach(([s]) => { const it = IT[ie[s]]; if (it && it.char === c && it.slot === s && G.owned[it.id]) G.equip[c][s] = it.id; }); });
    G.lookAt = incA;
  } else if (!incA && !myA) { // Stände ohne Zeitpunkt (vor dem Update gewählt):
    // Der weiter fortgeschrittene Stand gibt Figur und Ausrüstung vor (bei Gleichstand eine feste Regel); wo er nur die Grundausstattung trägt, gilt die des anderen.
    // So landen beide Geräte nach einem Abgleich hin und zurück beim selben Aussehen.
    // Bei gleichem Stand entscheidet eine feste Regel (Vergleich des Aussehens), die beide Geräte gleich anwenden.
    const lead = ahead || (tie && lookKey(inc) > lookKey(G));
    if (lead && inc.char && ANIMALS[inc.char]) G.char = inc.char;
    CHARS.forEach((c) => {
      const ie = inc.equip && inc.equip[c], base = baseEquip(c); if (!ie) return;
      const incBase = SLOTS.every(([s]) => !ie[s] || ie[s] === base[s]), myBase = SLOTS.every(([s]) => G.equip[c][s] === base[s]);
      if ((lead && !incBase) || myBase) SLOTS.forEach(([s]) => { const it = IT[ie[s]]; if (it && it.char === c && it.slot === s && G.owned[it.id]) G.equip[c][s] = it.id; });
    });
  }
  fix(G);
  return true;
}
