/**
 * Events – Klausur-Lernaktionen mit Kurz-Lektionen, eigenen Fragen und Sonderbelohnung bis zum Klausurtermin.
 * Regeln wie in der Live-App (evKapQ, evOn, evSure, evReady, learnEv, learnEvFinal, evStatus, Abschlusstest).
 * Die Belohnung selbst vergibt das Original-Belohnungs-Modul (gm("evFinal"), gm("evKap")).
 */
import { EVENTS } from "@/content/catalog";
import type { EventCatalog, Question } from "@/content/schema";
import { daysBetween, shuffle, today } from "./dates";
import type { Plan } from "./lernen";
import { ROUND, openOrder, st } from "./srs";
import type { State } from "./state";

type Kap = EventCatalog["kapitel"][number];
export const EV_FINAL = 15;
export const evById = (id: string | undefined) => (id ? EVENTS.find((e) => e.id === id) : undefined);
export const evKapQ = (_e: EventCatalog, k: Kap): Question[] => k.items;
export const evAllQ = (e: EventCatalog) => e.kapitel.flatMap((k) => evKapQ(e, k));
export const evLeft = (e: EventCatalog, day = today()) => daysBetween(day, e.ende);
export const evOn = (e: EventCatalog, day = today()) => day >= e.start && day <= e.ende;
/** Fragen „sicher“: gelb oder grün */
export const evSure = (S: State, list: { id: string }[]) => list.filter((q) => st(S, q.id) >= 1).length;
/** Abschlusstest frei: in jedem Kapitel mindestens 80 % gelb oder grün */
export const evReady = (S: State, e: EventCatalog) => e.kapitel.every((k) => { const l = evKapQ(e, k); return evSure(S, l) >= Math.ceil(l.length * 0.8); });
export const evDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "long" });

/** Kapitel lernen, ohne Kapitel: alle Kapitel gemischt (20 Fragen) */
export function learnEv(S: State, e: EventCatalog, kid?: string): Plan | null {
  if (kid) { const k = e.kapitel.find((x) => x.id === kid); return k ? { list: openOrder(S, evKapQ(e, k)), title: e.kurz + " · " + k.titel, src: { kind: "ev", ev: e.id, kap: k.id } } : null; }
  return { list: openOrder(S, evAllQ(e)).slice(0, ROUND), title: e.kurz + " · alle Kapitel gemischt", src: { kind: "ev", ev: e.id } };
}
/** Abschlusstest: 15 Auswahlfragen, aus jedem Kapitel mindestens zwei (nur wenn freigeschaltet) */
export function learnEvFinal(S: State, e: EventCatalog): Plan | null {
  if (!evReady(S, e)) return null;
  const per = e.kapitel.map((k) => shuffle(evKapQ(e, k).filter((q) => q.type === "mc")));
  let pick = per.flatMap((l) => l.slice(0, 2));
  pick = pick.concat(shuffle(per.flatMap((l) => l.slice(2))).slice(0, Math.max(0, EV_FINAL - pick.length))).slice(0, EV_FINAL);
  return { list: shuffle(pick), title: e.kurz + " · Abschlusstest", src: { kind: "ev", ev: e.id, final: true } };
}

/** Stand der Belohnung aus dem Belohnungs-Modul (gm("evInfo")) */
export type EvInfo = { got?: number; done?: number; best?: number; kap?: Record<string, number> };
export function evStatusTxt(e: EventCatalog, inf: EvInfo, day = today()) {
  const left = evLeft(e, day);
  return inf.got ? "Belohnung erhalten" : day < e.start ? "startet am " + evDate(e.start) : left > 0 ? `noch ${left} ${left === 1 ? "Tag" : "Tage"}` : left === 0 ? "letzter Tag" : "beendet";
}
/** Ergebnis des Abschlusstests (s.evRes): sicher = richtig und nicht geraten; bestanden ab 80 % */
export type EvRes = { sure: number; n: number; pass: boolean; got: boolean; late: boolean };
export const evPassFallback = (sure: number, n: number) => sure >= Math.ceil(n * 0.8);
/** Kapitel gemeistert: alle Fragen gelb oder grün */
export const kapMastered = (S: State, e: EventCatalog, kid: string) => { const k = e.kapitel.find((x) => x.id === kid); return !!k && evKapQ(e, k).every((q) => st(S, q.id) >= 1); };
