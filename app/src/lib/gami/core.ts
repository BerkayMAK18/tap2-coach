/**
 * Regeln des Belohnungs-Moduls – 1:1 wie in der Live-App: XP/Level/Serien, Tagesquests, Login-Kalender,
 * Schatzkammer (Raten, Soft/Hard-Pity, Highlight-Garantie, Erstattung), Garderobe, Titel, Event-Belohnungen.
 * Die Funktionen ändern den übergebenen Stand G und melden Effekte (Speichern, Hinweise, Fenster, Abgleich) über
 * ctx.fx – Speicher und Oberfläche liegen im Store (store/gami.ts). Zufall: Math.random, Zeit: Date.now (wie das Original).
 */
import type { EventCatalog, Question } from "@/content/schema";
import { daysBetween } from "@/lib/dates";
import { CHARS } from "./art";
import { CAL, GACHA, IT, ITEMS, QN, QPOOL, SKINS, fmtM, hash, mult, need, type CalDay, type Item, type Quest } from "./items";
import { TITLES, TPX, type TitleEnv } from "./titles";
import type { EvRec, GState, Pity } from "./state";

/** Effekte, die die Regeln auslösen (Zeiten wie in der Live-App) */
export interface Fx {
  save(): void;
  /** Hinweis unten (Text, kein HTML), optional verzögert */
  toast(text: string, delay?: number): void;
  /** Level-Fenster (nach 500 ms) */
  levelUp(): void;
  /** +XP-Anzeige über der Antwort (nach 30 ms) */
  float(msg: string, sure: boolean): void;
  confetti(n?: number): void;
  /** Fenster „Event-Belohnung“ (nach 400 ms) */
  evReward(e: EventCatalog, up: number): void;
  lbSoon(ms?: number): void;
  syncSoon(ms?: number): void;
}
/** Laufzeit (nicht gespeichert): letzte Antwort für „Geraten“ */
export type Rt = { last: { id: string; f: number; snap: string; done?: boolean } | null };
export type Ctx = TitleEnv & { today: () => string; fx: Fx; rt: Rt };

// ---- Titel
export function titleCheck(G: GState, ctx: Ctx) {
  G.titles = G.titles || {};
  const neu = TITLES.filter((t) => { if (!t.ok || G.titles[t.id]) return false; try { return t.ok(G, ctx); } catch { return false; } });
  if (!neu.length) return;
  neu.forEach((t) => { G.titles[t.id] = Date.now(); }); ctx.fx.save();
  ctx.fx.toast(neu.length === 1 ? `🏷️ Neuer Titel: ${neu[0].name} – anlegen in der Garderobe` : `🏷️ ${neu.length} neue Titel freigeschaltet – schau in die Garderobe`, 400);
}

// ---- Fortschritt
export function addXP(G: GState, ctx: Ctx, n: number, quiet?: boolean) {
  G.xp += n; G.earned += n; let up = 0;
  while (G.xp >= need(G.level)) { G.xp -= need(G.level); G.level++; up++; G.federn += 100; if (G.level % 5 === 0) G.tickets++; }
  if (up && !quiet) ctx.fx.levelUp();
  return up;
}

// ---- Tag und Quests
export function rollDay(G: GState, day: string) {
  if (!G.today || G.today.day !== day) { G.today = { day, answered: 0, correct: 0, maxCombo: 0, sowi: 0, t2: 0, green: 0, fixed: 0, fresh: 0 }; G.quests = null; }
  if (!G.quests || !Array.isArray(G.quests.ids) || G.quests.ids.length !== QN || !G.quests.ids.every((id) => QPOOL.some((q) => q.id === id))) {
    const pool = QPOOL.slice(); let h = hash(day); const ids: string[] = [];
    while (ids.length < QN) { const q = pool.splice(h % pool.length, 1)[0]; if (!(q.key === "maxCombo" && ids.some((x) => /^combo/.test(x)))) ids.push(q.id); h = hash(day + ":" + ids.length + ":" + pool.length); if (!pool.length) break; }
    G.quests = { ids, claimed: [], chest: false };
  }
}
export const questOf = (id: string) => QPOOL.find((x) => x.id === id)!;
export const qprog = (G: GState, q: Quest) => (q.calc ? q.calc(G.today!) : Math.min(q.goal, (G.today![q.key!] as number) || 0));
/** Roter Punkt an der Figur: Login-Bonus, Quest oder Tagestruhe abholbar */
export const claimable = (G: GState, day: string) => { rollDay(G, day); const Q = G.quests!; return G.loginClaimed !== day || Q.ids.some((id) => { const q = questOf(id); return qprog(G, q) >= q.goal && !Q.claimed.includes(id); }) || (Q.claimed.length === Q.ids.length && !Q.chest); };

// ---- Antworten
// Nur „sicher gewusst“ zählt: XP, Federn, Serie und die Quests für richtige Antworten.
// „Unsicher“ (Wissensfrage) oder „Geraten“ (Auswahlfrage) gibt nichts und beendet die Serie – wie ein Fehler (Serien-Schild rettet sie).
const SNAP = ["earned", "xp", "level", "federn", "tickets", "combo", "best", "xp2Left", "shieldOn", "today"];
export function onAnswer(G: GState, ctx: Ctx, q: Pick<Question, "id" | "topic">, ok: boolean, unsure: boolean, f: number, t: number, noSnap?: boolean) {
  rollDay(G, ctx.today());
  if (!noSnap) ctx.rt.last = { id: q.id, f, snap: JSON.stringify(Object.fromEntries(SNAP.map((k) => [k, G[k]]))) };
  const st = G.today!, tp = TPX[q.topic], sure = ok && !unsure;
  st.answered++;
  if (tp && tp.teil === "SoWi") st.sowi++;
  if (tp && tp.teil !== "SoWi" && tp.teil.includes("2")) st.t2 = (st.t2 || 0) + 1;
  if (f === -1) st.fresh = (st.fresh || 0) + 1;
  let msg: string | undefined;
  if (sure) {
    G.combo++; st.correct++; st.maxCombo = Math.max(st.maxCombo, G.combo); G.best = Math.max(G.best, G.combo);
    if (f === 0) st.fixed = (st.fixed || 0) + 1;
    if (t === 2 && f !== 2) st.green = (st.green || 0) + 1;
    const m = mult(G.combo), boost = G.xp2Left > 0 ? 2 : 1; if (boost > 1) G.xp2Left--;
    const xp = Math.round(10 * m * boost); G.federn += 5; addXP(G, ctx, xp);
    msg = `+${xp} XP${m > 1 ? ` · ${fmtM(m)}` : ""}${boost > 1 ? " · 🧪" : ""}`;
    if ([3, 6, 10].includes(G.combo)) ctx.fx.toast(`🔥 ${G.combo}er-Serie! Ab jetzt ${fmtM(mult(G.combo))} XP`, 150);
  } else {
    if (ok) msg = "Nicht sicher · keine XP";
    if (G.shieldOn && G.combo > 0) { G.shieldOn = false; ctx.fx.toast("🛡️ Das Schild hat deine Serie gerettet", 150); }
    else G.combo = 0;
  }
  if (new Date().getHours() < 4) (G.flags = G.flags || {}).nacht = 1;
  G.u = Date.now(); // Serie/Boosts geändert (Abgleich zwischen Geräten)
  titleCheck(G, ctx);
  ctx.fx.save(); ctx.fx.lbSoon();
  if (msg) ctx.fx.float(msg, sure);
}
/**
 * Tutor-Aufgabe bewertet (nur Dev-App, Prüfer-Tutor): zählt wie eine Antwort in Tagesquests, Serie und Tagesstatistik;
 * die XP richten sich nach den erreichten Punkten (xp = Punkte × XP_PRO_PUNKT); nach Serien-Bonus und Trank wird auf
 * cap gedeckelt (Rest der Tagesobergrenze aller Geräte, lib/tutor-state.ts). Sie laufen über addXP wie alle XP, landen also in G.earned/G.xp/G.level und damit im Sync-Paket
 * (pack: x/l/p) und in der Rangliste (tap2_lb_push: earned). Die Live-App übernimmt sie beim Abgleich (mirror: XP vom
 * weiter fortgeschrittenen Stand) – Format unverändert, getestet in tutor-xp.test.ts.
 * „richtig“ (Serie, Quest „richtig“) = mindestens die Hälfte der Punkte und nicht als geraten/unsicher markiert.
 * Serien-Bonus und Trank gelten wie bei Antworten, die Federn (+5) nur bei „richtig“.
 */
export function onTutor(G: GState, ctx: Ctx, q: Pick<Question, "id" | "topic">, punkte: number, max: number, unsure: boolean, xp: number, cap: number) {
  rollDay(G, ctx.today());
  const st = G.today!, tp = TPX[q.topic], ok = max > 0 && punkte / max >= 0.5, sure = ok && !unsure;
  st.answered++;
  if (tp && tp.teil === "SoWi") st.sowi++;
  if (tp && tp.teil !== "SoWi" && tp.teil.includes("2")) st.t2 = (st.t2 || 0) + 1;
  let gain = 0;
  if (sure) { G.combo++; st.correct++; st.maxCombo = Math.max(st.maxCombo, G.combo); G.best = Math.max(G.best, G.combo); G.federn += 5; }
  else if (G.shieldOn && G.combo > 0) { G.shieldOn = false; ctx.fx.toast("🛡️ Das Schild hat deine Serie gerettet", 150); }
  else G.combo = 0;
  if (xp > 0 && cap > 0) {
    const m = sure ? mult(G.combo) : 1, boost = G.xp2Left > 0 ? 2 : 1; if (boost > 1) G.xp2Left--;
    gain = Math.max(0, Math.min(cap, Math.round(xp * m * boost))); addXP(G, ctx, gain);
  }
  if (new Date().getHours() < 4) (G.flags = G.flags || {}).nacht = 1;
  G.u = Date.now();
  titleCheck(G, ctx);
  ctx.fx.save(); ctx.fx.lbSoon();
  ctx.fx.float(gain ? `+${gain} XP · ${fmtP(punkte)}/${fmtP(max)} P.` : `${fmtP(punkte)}/${fmtP(max)} P.`, sure);
  return gain;
}
const fmtP = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

/** „Geraten“ nach einer richtigen Auswahlfrage: XP und Serie dieser Antwort zurücknehmen und als unsicher werten */
export function onGuess(G: GState, ctx: Ctx, q: Pick<Question, "id" | "topic">) {
  const L = ctx.rt.last;
  if (!L || L.id !== q.id || L.done) return;
  Object.assign(G, JSON.parse(L.snap)); L.done = true;
  onAnswer(G, ctx, q, true, true, L.f, 1, true);
}
/** Serien-Anzeige in der Lernrunde (chip der Live-App): ab 2 in Folge */
export const chipText = (G: GState) => (G.combo >= 2 ? `🔥 ${G.combo}${mult(G.combo) > 1 ? " · " + fmtM(mult(G.combo)) : ""}` : "");

// ---- Quests und Tagestruhe
export function claimQuest(G: GState, ctx: Ctx, id: string) {
  const q = questOf(id); if (!q || !G.quests || qprog(G, q) < q.goal || G.quests.claimed.includes(q.id)) return false;
  G.quests.claimed.push(q.id); G.federn += q.f; addXP(G, ctx, q.xp); ctx.fx.save(); ctx.fx.toast(`Quest erledigt: +${q.f} 🪶 · +${q.xp} XP`);
  return true;
}
export function openChest(G: GState, ctx: Ctx) {
  if (!G.quests || G.quests.chest || G.quests.claimed.length < G.quests.ids.length) return false;
  G.quests.chest = true; G.federn += 300; G.tickets += 2; ctx.fx.save(); ctx.fx.confetti(40);
  return true;
}

// ---- Login-Kalender
export type LoginOffer = { t: string; streak: number; lost: boolean; oldStreak: number; idx: number; round: number; r: CalDay };
export function loginOffer(G: GState, day: string): LoginOffer | null {
  if (G.loginClaimed === day) return null;
  const cont = !!G.lastLogin && daysBetween(G.lastLogin, day) === 1, streak = cont ? G.loginStreak + 1 : 1, lost = !!G.lastLogin && !cont && G.loginStreak > 1;
  return { t: day, streak, lost, oldStreak: G.loginStreak, idx: G.calIdx, round: G.calRound, r: CAL[G.calIdx] };
}
/** „Tag N abholen“: Werte von der Anzeige des Fensters (wie die Live-App) */
export function claimLogin(G: GState, ctx: Ctx, o: LoginOffer) {
  if (G.loginClaimed === ctx.today()) return false;
  const { r, t, streak } = o;
  if (r.f) G.federn += r.f; if (r.t) G.tickets += r.t; if (r.b) G.boosts[r.b as "xp2"]++;
  G.loginStreak = streak; G.lastLogin = t; G.loginClaimed = t; G.calIdx++;
  if (G.calIdx >= CAL.length) { G.calIdx = 0; G.calRound++; ctx.fx.confetti(40); ctx.fx.toast(`Woche geschafft! Runde ${G.calRound} beginnt – alle Belohnungen wieder verfügbar`, 300); }
  ctx.fx.save();
  return true;
}
export const loginToast = (r: CalDay) => `Login-Bonus: ${r.f ? "+" + r.f + " 🪶" : r.t ? "+" + r.t + " 🎟️" : "+1 " + IT[r.b!]!.name}`;

// ---- Schatzkammer
export const poolOf = (c: string, r: string) => ITEMS.filter((i) => i.rar === r && (i.char === c || !i.char));
export const ssrChance = (n: number) => (n >= GACHA.hardPity ? 1 : Math.min(1, GACHA.rates.SSR + Math.max(0, n - GACHA.softPity + 1) * GACHA.softStep));
export const pityOf = (G: GState, c: string): Pity => (G.pity[c] = G.pity[c] || { ssr: 0, sr: 0, guar: false });
export function featuredOf(c: string, day: string) { const l = SKINS.filter((s) => s.char === c && s.rar === "SSR"), w = Math.floor((new Date(day + "T12:00:00").getTime() / 864e5 + 3) / 7); return l[(w + CHARS.indexOf(c)) % l.length]; }
export const daysToMonday = (day: string) => { const d = new Date(day + "T12:00:00").getDay(); return ((8 - d) % 7) || 7; };
export function rollOne(G: GState, c: string, day: string): Item {
  const P = pityOf(G, c); P.ssr++; P.sr++;
  const pS = ssrChance(P.ssr), x = Math.random();
  const r = x < pS ? "SSR" : (P.sr >= GACHA.srEvery || x < pS + GACHA.rates.SR) ? "SR" : x < pS + GACHA.rates.SR + GACHA.rates.R ? "R" : "N";
  let item: Item;
  if (r === "SSR") { const feat = featuredOf(c, day); if (P.guar || Math.random() < GACHA.featured) { item = feat; P.guar = false; } else { const o = poolOf(c, "SSR").filter((i) => i.id !== feat.id); item = o[Math.floor(Math.random() * o.length)]; P.guar = true; } P.ssr = 0; P.sr = 0; }
  else { if (r === "SR") P.sr = 0; const pool = poolOf(c, r); item = pool[Math.floor(Math.random() * pool.length)]; }
  G.pulls++; return item;
}
export type Grant = { it: Item; gain?: string; dup?: boolean; isNew?: boolean };
export function grant(G: GState, it: Item): Grant {
  if (it.slot === "cur") { G.federn += 30; return { it, gain: "+30 🪶" }; }
  if (it.slot === "boost") { G.boosts[it.id as "xp2"]++; return { it, gain: "+1" }; }
  if (G.owned[it.id]) { G.federn += GACHA.refund[it.rar]; return { it, dup: true, gain: "+" + GACHA.refund[it.rar] + " 🪶" }; }
  G.owned[it.id] = 1; return { it, isNew: true };
}
export type PullResult = { n: number; cost: number; feat: Item; items: Item[]; res: Grant[]; top: string; won: boolean; lost: boolean };
/** n Truhen öffnen (Tickets zuerst, sonst Federn). null = nicht genug. */
export function pull(G: GState, ctx: Ctx, n: number): PullResult | null {
  const c = G.banner, day = ctx.today(), useT = G.tickets >= n, cost = n === 1 ? GACHA.cost1 : GACHA.cost10;
  if (!useT && G.federn < cost) return null;
  if (useT) G.tickets -= n; else G.federn -= cost;
  const feat = featuredOf(c, day), items = Array.from({ length: n }, () => rollOne(G, c, day)), res = items.map((i) => grant(G, i));
  items.forEach((i) => G.hist.unshift(i.rar)); G.hist = G.hist.slice(0, 60); ctx.fx.save();
  const top = ["SSR", "SR", "R", "N"].find((r) => items.some((i) => i.rar === r))!;
  return { n, cost, feat, items, res, top, won: items.some((i) => i.id === feat.id), lost: items.some((i) => i.rar === "SSR" && i.id !== feat.id) };
}

// ---- Garderobe
export function equip(G: GState, id: string) { const it = IT[id]; if (!it || !G.owned[it.id]) return false; G.equip[it.char!][it.slot] = it.id; G.lookAt = Date.now(); return true; }
export function setTitle(G: GState, id: string) { if (id && !(G.titles || {})[id]) return false; G.title = id; G.titleAt = G.lookAt = Date.now(); return true; }
export function applyBoost(G: GState, ctx: Ctx, id: string) { if ((G.boosts as Record<string, number>)[id] < 1) return false; (G.boosts as Record<string, number>)[id]--; if (id === "xp2") G.xp2Left = 10; else G.shieldOn = true; G.u = Date.now(); ctx.fx.save(); ctx.fx.toast(`${IT[id]!.icon} ${IT[id]!.name} aktiviert`); return true; }

// ---- Events: Sonderbelohnungen, nur bis zum Klausurtermin
const evRec = (G: GState, e: EventCatalog): EvRec => (G.ev[e.id] = G.ev[e.id] || {});
export const evEq = (G: GState, e: EventCatalog) => Object.assign({}, G.equip[G.char], { shirt: `${G.char}-${String(e.reward.art)}` });
export const evInfo = (G: GState, e: EventCatalog): EvRec => Object.assign({}, (G.ev || {})[e.id] || {});
export function evKap(G: GState, ctx: Ctx, e: EventCatalog, kid: string) {
  const r = evRec(G, e); r.kap = r.kap || {}; if (r.kap[kid]) return false;
  r.kap[kid] = Date.now(); G.federn += 80; addXP(G, ctx, 40); ctx.fx.save(); ctx.fx.toast("📘 Kapitel gemeistert: +80 🪶 · +40 XP"); ctx.fx.syncSoon(3000); ctx.fx.lbSoon(5000);
  return true;
}
export function evFinal(G: GState, ctx: Ctx, e: EventCatalog, sure: number, n: number) {
  const day = ctx.today(), r = evRec(G, e), q = n ? sure / n : 0, pass = n > 0 && q >= 0.8, on = day >= e.start && day <= e.ende;
  r.best = Math.max(+(r.best as number) || 0, q); if (pass && !r.done) r.done = Date.now();
  let got = false;
  if (pass && on && !r.got) {
    r.got = Date.now(); got = true;
    if (e.reward.kind === "shirt") CHARS.forEach((c) => { if (IT[`${c}-${String(e.reward.art)}`]) G.owned[`${c}-${String(e.reward.art)}`] = 1; });
    else G.titles[String(e.reward.id)] = Date.now();
    G.federn += 300; G.tickets += 2; const up = addXP(G, ctx, 200, true);
    ctx.fx.evReward(e, up);
  }
  ctx.fx.save(); ctx.fx.lbSoon(5000); ctx.fx.syncSoon(3000);
  return { pass, got, late: pass && !on && !r.got };
}
/** „Jetzt anziehen“ / „Titel anlegen“ im Fenster der Event-Belohnung */
export function evWear(G: GState, e: EventCatalog) {
  if (e.reward.kind === "shirt") { const id = `${G.char}-${String(e.reward.art)}`; if (G.owned[id]) G.equip[G.char].shirt = id; }
  else { G.title = String(e.reward.id); G.titleAt = Date.now(); }
  G.lookAt = Date.now();
}
