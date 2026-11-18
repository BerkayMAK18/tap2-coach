/**
 * Zugriff auf die Kataloge (Themen, Fragen, Abbildungen, Events).
 *
 * Phase 1: Der TAP2-Katalog ist fest eingebunden (wird von Vite als eigener Chunk geladen und vom
 * Service Worker offline vorgehalten). Später lädt die Katalog-Bibliothek weitere Kataloge nach;
 * dann wird aus diesem Modul ein Register mit loadCatalog(id).
 */
import tap2Raw from "./generated/tap2.json";
import fisiRaw from "./fisi.json";
import { FISI_EXTRA, FISI_TOPICS } from "./fisi-bank";
import lf11aRaw from "./generated/event-lf11a.json";
import wpfRaw from "./generated/event-wpf.json";
import type { CardQuestion, EventCatalog, Question, Tap2Catalog, Topic } from "./schema";
import type { State } from "@/lib/state";

// Die Kataloge werden in catalog.test.ts gegen das Zod-Schema geprüft; hier reicht die Typzusicherung.
export const TAP2 = tap2Raw as unknown as Tap2Catalog;
export const FISI = {
  ...fisiRaw,
  topics: [...fisiRaw.topics, ...FISI_TOPICS],
  questions: [...fisiRaw.questions, ...FISI_EXTRA],
} as unknown as Tap2Catalog;
export type LearningArea = "fiae" | "fisi";
export const catalogFor = (area: LearningArea = "fiae"): Tap2Catalog => area === "fisi" ? FISI : TAP2;
export const topicsFor = (area: LearningArea = "fiae"): Topic[] => catalogFor(area).topics;
export const topicMapFor = (area: LearningArea = "fiae"): Record<string, Topic> => Object.fromEntries(topicsFor(area).map((t) => [t.id, t]));
export const questionsFor = (area: LearningArea = "fiae"): Question[] => catalogFor(area).questions;
/** Alle Events, auch deaktivierte – das Belohnungs-Modul braucht sie, damit Titel/Shirts daraus gültig bleiben. */
export const ALL_EVENTS = [lf11aRaw, wpfRaw] as unknown as EventCatalog[];
export const EVENTS = ALL_EVENTS.filter((e) => e.enabled);

export const TOPICS: Topic[] = TAP2.topics;
export const TP: Record<string, Topic> = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
export const BASE_Q: Question[] = TAP2.questions;
const QMAP: Record<string, Question> = Object.fromEntries(BASE_Q.map((q) => [q.id, q]));
const FISI_QMAP: Record<string, Question> = Object.fromEntries(FISI.questions.map((q) => [q.id, q]));
const EVQ: Record<string, Question> = Object.fromEntries(EVENTS.flatMap((e) => e.kapitel.flatMap((k) => k.items.map((q) => [q.id, q] as const))));

/** Für normalize(): bekannte Themen und Deck → Thema (Migration alter Sicherungen). */
export const NORMALIZE_CTX = {
  knownTopics: new Set([...TAP2.topics, ...FISI.topics].map((t) => t.id)),
  deckTopic: Object.fromEntries([...TAP2.topics, ...FISI.topics].flatMap((t) => t.decks.map((d) => [d, t.id] as const))),
};

/** Eigene Karten der Nutzerin / des Nutzers als Fragen. */
export const customQ = (S: State, area: LearningArea = "fiae"): Question[] => {
  const known = new Set(topicsFor(area).map((t) => t.id));
  return Object.entries(S.custom).filter(([t]) => known.has(t)).flatMap(([t, l]) => l.map((c): CardQuestion & { own: true } => ({ id: c.id, type: "card", topic: t, q: c.f, a: c.b, note: "", code: true, own: true })));
};
/** Alle Fragen, die zur Prüfungsreife zählen (ohne Events). */
export const allQ = (S: State, area: LearningArea = "fiae") => questionsFor(area).concat(customQ(S, area));
export const getQ = (S: State, id: string, area: LearningArea = "fiae"): Question | undefined => (area === "fisi" ? FISI_QMAP[id] : QMAP[id]) || EVQ[id] || customQ(S, area).find((q) => q.id === id);
export const topicQ = (S: State, tid: string, area: LearningArea = "fiae") => allQ(S, area).filter((q) => q.topic === tid);
export const inTeil = (t: Topic, part: "t1" | "t2" | "wiso") => (part === "wiso" ? t.teil === "SoWi" : t.teil !== "SoWi" && t.teil.includes(part === "t1" ? "1" : "2"));
/** Abbildung zu einer Frage (z. B. UML-Diagramm in der Antwort). */
export const figFor = (id: string) => TAP2.figs[id]; // enthält auch Event-Abbildungen (Schlüssel = Frage- oder Kapitel-ID)
