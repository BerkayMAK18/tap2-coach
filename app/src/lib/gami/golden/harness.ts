/**
 * Prüfstand für die Golden-Tests: das Original-Belohnungs-Modul (original.js) mit derselben Umgebung wie in der
 * Live-App bzw. der bisherigen Einbettung (gami-env.ts) – Lernstand, Tag und Sync kommen aus dem Test.
 * Dazu ein Kontext für die neuen Funktionen, der alle Effekte aufzeichnet.
 */
import { ALL_EVENTS, BASE_Q, TOPICS, allQ, topicQ } from "@/content/catalog";
import { keyRaw } from "@/lib/crypto";
import { daysBetween } from "@/lib/dates";
import { counts, st } from "@/lib/srs";
import { blank, dayStr, isObj, mapObj, num, plain, type State } from "@/lib/state";
import type { Ctx, Fx } from "../core";
import { TPX } from "../titles";
import { createGami } from "./original.js";

export type World = { S: State; day: string; synced: boolean; syncKey?: string; conf?: boolean; rpc?: (fn: string, a: Record<string, unknown>) => Promise<unknown>; view?: string; ui?: Record<string, unknown> };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const te = new TextEncoder();
const sha = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(s)));
const hexOf = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const QMAP = Object.fromEntries(BASE_Q.map((q) => [q.id, q]));

export type Old = Record<string, (...a: unknown[]) => any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export function oldGami(w: World): Old {
  return createGami({
    esc, render: () => {}, hud: () => {}, num, today: () => w.day, daysBetween, rpc: (fn: string, a: Record<string, unknown>) => (w.rpc ? w.rpc(fn, a) : Promise.reject(new Error("offline"))), sha, hexOf, plain, isObj, dayStr, mapObj, keyRaw,
    syncConf: () => !!w.conf, syncGet: () => (w.synced ? { key: w.syncKey || "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2-3456-7890" } : null), syncSoon: () => {},
    TP: TPX, QMAP, EVENTS: ALL_EVENTS, TOPICS,
    topicQ: (tid: string) => topicQ(w.S, tid), st: (id: string) => st(w.S, id), counts: (l: { id: string }[]) => counts(w.S, l as never), allQ: () => allQ(w.S),
    S: () => w.S, UI: () => w.ui || {}, view: () => w.view || "start",
  }) as Old;
}

/** Aufgezeichnete Effekte der neuen Funktionen */
export type Rec = { toasts: { text: string; delay: number }[]; floats: { msg: string; sure: boolean }[]; levelUps: number[]; confetti: number[]; evRewards: { e: string; up: number }[]; saves: number; lb: (number | undefined)[]; sync: (number | undefined)[] };
export function newCtx(w: World, G: () => { level: number }): Ctx & { rec: Rec } {
  const rec: Rec = { toasts: [], floats: [], levelUps: [], confetti: [], evRewards: [], saves: 0, lb: [], sync: [] };
  const fx: Fx = {
    save: () => { rec.saves++; }, toast: (text, delay = 0) => rec.toasts.push({ text, delay }), levelUp: () => rec.levelUps.push(G().level),
    float: (msg, sure) => rec.floats.push({ msg, sure }), confetti: (n = 50) => rec.confetti.push(n), evReward: (e, up) => rec.evRewards.push({ e: e.id, up }),
    lbSoon: (ms) => rec.lb.push(ms), syncSoon: (ms) => rec.sync.push(ms),
  };
  return { S: () => w.S, today: () => w.day, synced: () => w.synced, lbJoined: () => { try { return !!JSON.parse(localStorage.getItem("tap2coach-lb") || "null")?.joined; } catch { return false; } }, fx, rt: { last: null }, rec };
}

/** Zufallsquelle mit festem Startwert (mulberry32) */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Lernstand mit n Fragen in Stufe s (0 rot, 1 gelb, 2 grün) */
export function stateWith(spec: { s: number; n: number; from?: number }[], extra: Partial<State> = {}): State {
  const q: Record<string, unknown> = {}; let i = 0;
  for (const { s, n, from } of spec) { if (from != null) i = from; for (let k = 0; k < n; k++, i++) { const id = BASE_Q[i].id; q[id] = { b: s === 2 ? 4 : s, s, d: "2026-11-20", t: 1, n: 1, w: s === 0 ? 1 : 0 }; } }
  return { ...blank(), q: q as State["q"], ...extra };
}
