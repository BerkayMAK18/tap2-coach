/**
 * Umgebung für das Original-Belohnungs-Modul (gami.js) – bildet die Hilfsfunktionen der Live-App nach.
 * Nur hier wird das Modul angebunden; die App ruft es über `gm()` auf (Fehler im Modul stören das Lernen nie,
 * genau wie in der Live-App).
 */
import { create } from "zustand";
import { ALL_EVENTS, BASE_Q, TOPICS, TP as TOPIC_MAP, allQ, topicQ } from "@/content/catalog";
import { daysBetween, today } from "@/lib/dates";
import { keyRaw } from "@/lib/crypto";
import { counts, st } from "@/lib/srs";
import { dayStr, isObj, mapObj, num, plain } from "@/lib/state";
import { supabase } from "@/lib/supabase";
import { useProgress } from "@/store/progress";
import { liveGet } from "@/store/livesync";
import { createGami } from "./gami.js";

/** Zähler zum Neuzeichnen der React-Ansichten, wenn das Modul render()/hud() aufruft. */
export const useGamiTick = create<{ n: number; bump: () => void }>((set) => ({ n: 0, bump: () => set((s) => ({ n: s.n + 1 })) }));
const bump = () => useGamiTick.getState().bump();

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const te = new TextEncoder();
const sha = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(s)));
const hexOf = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function rpc(fn: string, args: Record<string, unknown>) {
  if (!supabase) throw new Error("Server nicht eingerichtet");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(String(error.message).slice(0, 160));
  return data;
}
// Themen inkl. Event-Kapitel (wie TP in der Live-App: „ev:<event>:<kapitel>“ mit teil „Event“)
const TP: Record<string, { id: string; n: string; teil: string }> = { ...TOPIC_MAP };
ALL_EVENTS.forEach((e) => e.kapitel.forEach((k) => { const id = `ev:${e.id}:${k.id}`; TP[id] = { id, n: `${e.kurz} · ${k.titel}`, teil: "Event" }; }));
const QMAP = Object.fromEntries(BASE_Q.map((q) => [q.id, q]));
const S = () => useProgress.getState().S;

let current: { view: string; ui: Record<string, unknown> } = { view: "start", ui: {} };
export const setGamiContext = (view: string, ui: Record<string, unknown> = {}) => { current = { view, ui }; };

type Gami = Record<string, (...a: unknown[]) => unknown>;
let GAMI: Gami | null = null;
try {
  GAMI = createGami({
    esc, render: bump, hud: bump, num, today, daysBetween, rpc, sha, hexOf, plain, isObj, dayStr, mapObj, keyRaw,
    syncConf: () => !!supabase,
    syncGet: () => liveGet(),
    syncSoon: () => { void import("@/store/livesync").then((m) => setTimeout(() => void m.useLiveSync.getState().syncNow(), 2000)); },
    TP, QMAP, EVENTS: ALL_EVENTS, TOPICS,
    topicQ: (tid: string) => topicQ(S(), tid), st: (id: string) => st(S(), id), counts: (l: { id: string }[]) => counts(S(), l), allQ: () => allQ(S()),
    S, UI: () => current.ui, view: () => current.view,
  }) as Gami;
} catch (e) { GAMI = null; console.error("Belohnungen deaktiviert:", e); }

/** Aufruf wie gm() in der Live-App: abgesichert, Fehler werden nur protokolliert. */
export function gm(fn: string, ...a: unknown[]): unknown {
  try { return GAMI && GAMI[fn] ? GAMI[fn](...a) : undefined; } catch (e) { console.error(e); return undefined; }
}
