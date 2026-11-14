/**
 * Belohnungs-Zustand (Speicher tap2coach-gami) – 1:1 wie in der Live-App: frischer Stand, Reparatur nach dem Laden
 * (fix), erster Start mit Startbonus, kompaktes Format für Sync/Übertragung (pack/unpack) und Zusammenführen (merge).
 * Format und Regeln unverändert: Sync mit der Live-App und die Rangliste tap2_lb hängen daran (docs/MIGRATION.md).
 * Funktionen arbeiten direkt auf dem übergebenen Stand G (wie das Original), ohne Speicher oder Oberfläche.
 */
import { dayStr, isObj, mapObj, num, plain, type State } from "@/lib/state";
import { ANIMALS, CHARS } from "./art";
import { IT, ITEMS, QPOOL, SKINS, SLOTS, baseEquip, need, type Equip, type Today } from "./items";
import { TI, TITLES } from "./titles";

export type Pity = { ssr: number; sr: number; guar: boolean; [k: string]: unknown };
export type EvRec = { best?: number; done?: number; got?: number; kap?: Record<string, number>; [k: string]: unknown };
export type Quests = { ids: string[]; claimed: string[]; chest: boolean };
export type GState = {
  v: number; earned: number; xp: number; level: number; federn: number; tickets: number; combo: number; best: number;
  lastLogin: string | null; loginClaimed: string | null; loginStreak: number; calIdx: number; calRound: number;
  today: Today | null; quests: Quests | null; owned: Record<string, number>; equip: Record<string, Equip>; char: string; banner: string;
  boosts: { xp2: number; shield: number }; xp2Left: number; shieldOn: boolean; pity: Record<string, Pity>; hist: string[]; pulls: number; tab: string;
  titles: Record<string, number>; title?: string; titleAt?: number; lookAt?: number; ev: Record<string, EvRec>; flags?: Record<string, number>;
  /** Konto (seit v2.8): Eingänge/Ausgänge von Federn, Tickets und Boosts – Kontostand = Eingang − Ausgang */
  kb?: Record<Kb, number>;
  /** Zeitpunkt der letzten Änderung von Serie und aktiven Boosts (seit v2.8) */
  u?: number;
  [k: string]: unknown;
};
type Loose = Record<string, unknown>;

// ---- Konto (seit v2.8): Damit Ausgaben (Schatzkammer, Boosts) auf allen Geräten ankommen, zählt jedes Gerät Eingänge
// und Ausgänge getrennt. Beide wachsen nur – beim Abgleich gilt je Zähler das Maximum. Nacheinander genutzte Geräte
// landen so beim exakt gleichen Stand; gleichzeitige Änderungen gehen nie zulasten des Nutzers.
export const KB = ["fi", "fo", "ti", "to", "xi", "xo", "si", "so"] as const;
export type Kb = (typeof KB)[number];
/** Konto an den Kontostand angleichen: Was seit dem letzten Mal dazukam, ist Eingang, was fehlt, Ausgang. */
export function book(G: GState) {
  const K = (G.kb = (isObj(G.kb) ? G.kb : {}) as Record<Kb, number>);
  KB.forEach((k) => { K[k] = Math.max(0, num(K[k])); });
  const adj = (cur: number, i: Kb, o: Kb) => { const d = cur - (K[i] - K[o]); if (d > 0) K[i] += d; else if (d < 0) K[o] -= d; };
  adj(G.federn, "fi", "fo"); adj(G.tickets, "ti", "to"); adj(G.boosts.xp2, "xi", "xo"); adj(G.boosts.shield, "si", "so");
}
/** JSON mit sortierten Schlüsseln (feste Regel für Gleichstände – gleiches Ergebnis auf allen Geräten) */
export const stab = (v: unknown): string => (Array.isArray(v) ? "[" + v.map(stab).join(",") + "]" : v && typeof v === "object" ? "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stab((v as Loose)[k])).join(",") + "}" : JSON.stringify(v ?? null));
const DAYK = ["answered", "correct", "maxCombo", "sowi", "t2", "green", "fixed", "fresh"];
const cleanToday = (t: Loose): Today => { const o: Loose = { day: t.day }; DAYK.forEach((k) => { o[k] = Math.max(0, num(t[k])); }); return o as Today; };
const cleanQuests = (q: unknown): Quests | null => {
  if (!isObj(q) || !Array.isArray(q.ids) || !q.ids.every((id) => QPOOL.some((x) => x.id === id))) return null;
  const ids = q.ids as string[]; return { ids: ids.slice(), claimed: Array.isArray(q.claimed) ? ids.filter((id) => (q.claimed as unknown[]).includes(id)) : [], chest: !!q.chest };
};

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
  ["lookAt", "titleAt", "u"].forEach((k) => { if (g[k] != null) g[k] = num(g[k]); });
  book(G);
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
export type Packed = { v: 1; x: number; l: number; p: number; f: number; t: number; o: Record<string, string>; e: Record<string, string>; c: string; b: [number, number]; y: Record<string, Pity>; n: number; s: [number, string | null, number, number, number]; a: number; ti: string; tt: string; tz: number; ev: Record<string, EvRec>;
  // seit v2.8 (ältere Versionen ignorieren diese Felder): Konto, Login-Tag, Tagesquests, Serie/Boosts, Zeitpunkt
  k: number[]; lc: string | null; qd: { t: Today; q: Quests | null } | null; r: [number, number, number]; u: number };
export function pack(G: GState): Packed {
  book(G);
  const own: Record<string, string[]> = {}; ITEMS.forEach((it) => { if (G.owned[it.id] && it.char && it.rar !== "S") (own[it.char] = own[it.char] || []).push(it.art!); }); // feste Reihenfolge (seit v2.8): gleicher Besitz = gleiches Paket
  const eq: Record<string, string> = {}; CHARS.forEach((c) => { eq[c] = SLOTS.map(([s]) => (IT[G.equip[c][s]] || { art: "" }).art || "").join("."); });
  return { v: 1, x: G.earned, l: G.level, p: G.xp, f: G.federn, t: G.tickets, o: Object.fromEntries(Object.entries(own).map(([c, l]) => [c, l.join(".")])), e: eq, c: G.char, b: [G.boosts.xp2, G.boosts.shield], y: G.pity, n: G.pulls, s: [G.loginStreak, G.lastLogin, G.calIdx, G.calRound, G.best], a: G.lookAt || 0, ti: TITLES.filter((t) => (G.titles || {})[t.id]).map((t) => t.id).join("."), tt: G.title || "", tz: G.titleAt || 0, ev: G.ev || {},
    k: KB.map((k) => G.kb![k]), lc: G.loginClaimed, qd: G.today ? { t: G.today, q: G.quests } : null, r: [G.combo, G.xp2Left, G.shieldOn ? 1 : 0], u: G.u || 0 };
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
  // seit v2.8
  if (Array.isArray(P.k)) { const K = {} as Record<Kb, number>; KB.forEach((k, i) => { K[k] = Math.max(0, num((P.k as unknown[])[i])); }); g.kb = K; }
  if (P.lc != null) g.loginClaimed = dayStr(P.lc) || null;
  if (isObj(P.qd) && isObj(P.qd.t) && dayStr(P.qd.t.day)) { g.today = cleanToday(P.qd.t); g.quests = cleanQuests(P.qd.q); }
  if (Array.isArray(P.r)) { g.combo = Math.max(0, Math.floor(num(P.r[0]))); g.xp2Left = Math.max(0, Math.floor(num(P.r[1]))); g.shieldOn = !!num(P.r[2]); }
  if (num(P.u)) g.u = num(P.u);
  return g;
}
/** Fremden Stand einmischen: Besitz/Titel/Events vereinigen, Fortschritt vom weiter fortgeschrittenen Stand, Aussehen von der jüngsten Wahl */
export function merge(G: GState, p: unknown) {
  const inc = unpack(p); if (!inc) return false;
  const I = inc as GState & Loose, M = G as GState & Loose;
  // Stand mit Konto (v2.8+): Spiegelung. Ohne Konto (ältere Version): bisherige Regel, das Konto gleicht fix() danach an.
  const neu = isObj(inc.kb) && !Array.isArray(inc.kb);
  Object.keys(inc.owned || {}).forEach((id) => { if (IT[id]) G.owned[id] = 1; });
  Object.keys(inc.titles || {}).forEach((id) => { if (TI[id] && !G.titles[id]) G.titles[id] = +inc.titles[id] || 1; }); // Titel: Vereinigung
  Object.entries(inc.ev || {}).forEach(([k, r]) => { if (!r || typeof r !== "object") return; const m = G.ev[k] = G.ev[k] || {}; m.best = Math.max(+(m.best as number) || 0, +(r.best as number) || 0); (["done", "got"] as const).forEach((f) => { if (+(r[f] as number) && (!+(m[f] as number) || +(r[f] as number) < +(m[f] as number))) m[f] = +(r[f] as number); }); m.kap = Object.assign({}, r.kap || {}, m.kap || {}); Object.entries(isObj(r.kap) ? r.kap : {}).forEach(([x, v]) => { if (+(v as number) && (!+(m.kap![x] as number) || +(v as number) < +(m.kap![x] as number))) m.kap![x] = +(v as number); }); }); // Kapitel: frühester Zeitpunkt (gleich auf allen Geräten) // Events: nie verlieren
  if (!neu) { G.boosts.xp2 = Math.max(G.boosts.xp2, +inc.boosts.xp2 || 0); G.boosts.shield = Math.max(G.boosts.shield, +inc.boosts.shield || 0); }
  if (inc.title !== undefined && (+(inc.titleAt as number) || 0) > (+(G.titleAt as number) || 0) && (!inc.title || G.titles[inc.title])) { G.title = inc.title; G.titleAt = +(inc.titleAt as number); } // Titel: die zuletzt getroffene Wahl
  const ahead = (+inc.earned || 0) > G.earned, tie = (+inc.earned || 0) === G.earned, incA = +(inc.lookAt as number) || 0, myA = +(G.lookAt as number) || 0;
  const lookKey = (g: GState) => g.char + "|" + CHARS.map((c) => SLOTS.map(([s]) => ((g.equip || {})[c] || {})[s] || "").join(",")).join(";");
  if (!neu && ahead) { // Fortschritt (ältere Version): der weiter fortgeschrittene Stand
    ["earned", "xp", "level", "federn", "tickets", "pulls", "best", "loginStreak", "lastLogin", "calIdx", "calRound"].forEach((k) => { if (I[k] != null) M[k] = I[k]; });
    if (inc.pity) G.pity = inc.pity;
  }
  if (neu) mirror(G, inc, ahead);
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

/** Spiegelung (v2.8+): Konto je Zähler das Maximum, XP vom weiter fortgeschrittenen Stand, Schatzkammer vom Stand mit
 *  mehr Zügen, Login-Kalender vom späteren Tag, Tagesquests zusammengeführt, Serie/aktive Boosts vom jüngeren Stand.
 *  Bei Gleichstand entscheidet eine feste Regel – beide Geräte kommen so zum selben Ergebnis. */
function mirror(G: GState, inc: GState, ahead: boolean) {
  const I = inc as GState & Loose, M = G as GState & Loose;
  book(G); const K = G.kb!;
  KB.forEach((k) => { K[k] = Math.max(K[k], Math.max(0, num(inc.kb![k]))); });
  G.federn = K.fi - K.fo; G.tickets = K.ti - K.to; G.boosts = { xp2: K.xi - K.xo, shield: K.si - K.so };
  if (ahead) ["earned", "xp", "level"].forEach((k) => { if (I[k] != null) M[k] = I[k]; });
  G.best = Math.max(G.best, +inc.best || 0);
  const ip = +inc.pulls || 0;
  if (ip > G.pulls || (ip === G.pulls && stab(inc.pity) > stab(G.pity))) { G.pulls = ip; if (inc.pity) G.pity = inc.pity; }
  const pad = (n: unknown) => String(Math.max(0, Math.floor(num(n)))).padStart(6, "0");
  const lk = (g: GState) => [g.loginClaimed || "", pad(g.calRound), pad(g.calIdx), pad(g.loginStreak), g.lastLogin || ""].join("|");
  if (lk(inc) > lk(G)) ["lastLogin", "loginClaimed", "loginStreak", "calIdx", "calRound"].forEach((k) => { M[k] = I[k]; });
  const it = inc.today as Loose | null, mt = G.today as Loose | null;
  if (it && dayStr(it.day)) {
    if (!mt || (it.day as string) > (mt.day as string)) { G.today = cleanToday(it); G.quests = cleanQuests(inc.quests); }
    else if (it.day === mt.day) {
      DAYK.forEach((k) => { mt[k] = Math.max(num(mt[k]), Math.max(0, num(it[k]))); });
      const iq = cleanQuests(inc.quests), q = G.quests;
      if (iq && q && iq.ids.join() === q.ids.join()) { q.claimed = q.ids.filter((id) => q.claimed.includes(id) || iq.claimed.includes(id)); q.chest = q.chest || iq.chest; }
      else if (iq && !q) G.quests = iq;
    }
  }
  const rv = (g: GState) => stab([Math.floor(num(g.combo)), Math.floor(num(g.xp2Left)), g.shieldOn ? 1 : 0]), iu = num(inc.u), mu = num(G.u);
  if (iu > mu || (iu === mu && rv(inc) > rv(G))) { G.combo = Math.max(0, Math.floor(num(inc.combo))); G.xp2Left = Math.max(0, Math.floor(num(inc.xp2Left))); G.shieldOn = !!inc.shieldOn; }
  if (iu > mu) G.u = iu;
}
