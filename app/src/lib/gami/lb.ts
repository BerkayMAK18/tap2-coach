/**
 * Bestenliste (freiwillig) – 1:1 wie in der Live-App, gleiche Tabelle tap2_lb und gleiche Funktionen
 * (tap2_lb_join/push/top/leave). Sichtbar sind nur Spitzname, Level, XP und Figur (+ Titel).
 * Die Eintrags-ID ist eine Prüfsumme des Sync-Schlüssels (verbundene Geräte teilen sich einen Eintrag) oder eines
 * zufälligen Geräte-Werts (tap2coach-lb). Sie wird nie angezeigt und vom Server nie herausgegeben.
 */
import { keyRaw } from "@/lib/crypto";
import { CHARS } from "./art";
import { IT, SLOTS, baseEquip, type Equip } from "./items";
import type { GState } from "./state";
import { TI } from "./titles";

export const KEY_LB = "tap2coach-lb";
export const NAME_RE = /^[A-Za-z0-9ÄÖÜäöüß_.-]{3,16}$/;
export type LbLocal = { token?: string; id?: string; name?: string; joined?: boolean; [k: string]: unknown };
export const lbGet = (): LbLocal => { try { const o = JSON.parse(localStorage.getItem(KEY_LB) || "null"); return o && typeof o === "object" ? o : {}; } catch { return {}; } };
export const lbSet = (o: LbLocal) => { try { localStorage.setItem(KEY_LB, JSON.stringify(o)); } catch { /* privat */ } };

/** Aussehen für die Rangliste: „tier:hut.auge.hals.bg.shirt[:titel]“ (Titel als dritter Teil – ältere Versionen ignorieren ihn) */
export const lookOf = (G: GState) => G.char + ":" + SLOTS.map(([s]) => (IT[G.equip[G.char][s]] || { art: "" }).art || "").join(".") + (G.title && TI[G.title] ? ":" + G.title : "");
/** Aussehen eines Eintrags (Fremddaten vom Server) → Tier, Ausrüstung, Titel – nur bekannte IDs */
export const lookEq = (str: unknown): [string, Equip, string] => {
  const [c, rest, ti] = String(str || "").split(":"), ch = CHARS.includes(c) ? c : "rabe", eq = baseEquip(ch);
  String(rest || "").split(".").forEach((a, i) => { const sl = SLOTS[i] && SLOTS[i][0], it = IT[ch + "-" + a]; if (sl && a && it && it.slot === sl) eq[sl] = it.id; });
  return [ch, eq, Object.prototype.hasOwnProperty.call(TI, ti) ? ti : ""];
};

const te = new TextEncoder();
const sha = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(s)));
export const hexOf = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
/** Eintrags-ID wie lbId() der Live-App: sha256("tap2-lb|s|" + Schlüssel) bzw. sha256("tap2-lb|t|" + Gerätetoken) */
export async function lbId(syncKey: string | null | undefined) {
  if (syncKey) return hexOf(await sha("tap2-lb|s|" + keyRaw(syncKey)));
  const lb = lbGet(); if (!lb.token) { lb.token = hexOf(crypto.getRandomValues(new Uint8Array(20))); lbSet(lb); }
  return hexOf(await sha("tap2-lb|t|" + lb.token));
}

/** Antwort von tap2_lb_top (Fremddaten – nur als Text angezeigt) */
export type LbEntry = { r: number; name: string; level: number; xp: number; look: string; me?: boolean };
export type LbData = { top: LbEntry[]; me: LbEntry | null; total: number };
