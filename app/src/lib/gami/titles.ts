/**
 * Titel (1:1 aus der Live-App): zum Anlegen in der Garderobe, sichtbar in der Rangliste. Freigeschaltet aus dem
 * Fortschritt (auch rückwirkend) oder über Events. IDs nie ändern – Besitz und Rangliste hängen daran.
 * Nur Kleinbuchstaben, Ziffern und „-“ (Format der Rangliste). Event-Titel aus ALLEN Events (auch abgeschalteten).
 */
import { ALL_EVENTS, BASE_Q, TOPICS, TP, allQ, topicQ } from "@/content/catalog";
import type { Question } from "@/content/schema";
import { counts, st } from "@/lib/srs";
import type { State } from "@/lib/state";
import { SKINS } from "./items";
import type { GState } from "./state";

/** Themen inkl. Event-Kapitel (wie TP in der Live-App: „ev:<event>:<kapitel>“ mit teil „Event“) */
export const TPX: Record<string, { id: string; n: string; teil: string }> = { ...TP };
ALL_EVENTS.forEach((e) => e.kapitel.forEach((k) => { const id = `ev:${e.id}:${k.id}`; TPX[id] = { id, n: `${e.kurz} · ${k.titel}`, teil: "Event" }; }));
const QMAP: Record<string, Question> = Object.fromEntries(BASE_Q.map((q) => [q.id, q]));

/** Was ein Titel zum Prüfen braucht (Lernstand, Sync, Rangliste) */
export type TitleEnv = { S: () => State; synced: () => boolean; lbJoined: () => boolean };
export type Title = { id: string; name: string; how: string; ok?: (G: GState, env: TitleEnv) => boolean; ev?: string };

const cntQ = (S: State, fn: (id: string, r: { s?: number }) => boolean) => Object.entries(S.q || {}).filter(([id, r]) => r && !id.startsWith("ev:") && fn(id, r as { s?: number })).length;
export const TITLES: Title[] = ([
  { id: "hello-world", name: "Hello World", how: "Die erste Frage sicher richtig beantworten", ok: (G) => G.earned > 0 },
  { id: "kaffee", name: "Kaffeegetrieben", how: "7 Tage am Stück einloggen", ok: (G) => G.loginStreak >= 7 },
  { id: "endlosschleife", name: "Endlosschleife", how: "Eine 20er-Serie schaffen", ok: (G) => G.best >= 20 },
  { id: "junior", name: "Junior Developer", how: "Level 10 erreichen", ok: (G) => G.level >= 10 },
  { id: "senior", name: "Senior Developer", how: "Level 20 erreichen", ok: (G) => G.level >= 20 },
  { id: "10x", name: "10x-Entwickler", how: "Level 30 erreichen", ok: (G) => G.level >= 30 },
  { id: "gruener-daumen", name: "Grüner Daumen", how: "100 Fragen auf Grün bringen", ok: (_G, v) => cntQ(v.S(), (_id, r) => r.s === 2) >= 100 },
  { id: "paragrafenreiter", name: "Paragrafenreiter", how: "50 SoWi-Fragen auf Grün bringen", ok: (_G, v) => cntQ(v.S(), (id, r) => r.s === 2 && !!QMAP[id] && !!TPX[QMAP[id].topic] && TPX[QMAP[id].topic].teil === "SoWi") >= 50 },
  { id: "fullstack", name: "Full-Stack-Azubi", how: "In jedem Thema mindestens eine Frage auf Grün", ok: (_G, v) => { const S = v.S(); return TOPICS.every((t) => topicQ(S, t.id).some((q) => st(S, q.id) === 2)); } },
  { id: "production", name: "Ready for Production", how: "90 % Prüfungsreife erreichen", ok: (_G, v) => { const S = v.S(); return counts(S, allQ(S)).pct >= 0.9; } },
  { id: "simulant", name: "Prüfungssimulant", how: "Eine Prüfungssimulation abschließen", ok: (_G, v) => (v.S().runs || []).length > 0 },
  { id: "404", name: "404: Freizeit not found", how: "100 Fragen an einem Tag beantworten", ok: (G) => !!(G.today && G.today.answered >= 100) },
  { id: "nachteule", name: "Nachteule", how: "Zwischen Mitternacht und 4 Uhr lernen", ok: (G) => !!(G.flags && G.flags.nacht) },
  { id: "lootbox", name: "Lootbox-Lobbyist", how: "100-mal die Schatzkammer öffnen", ok: (G) => G.pulls >= 100 },
  { id: "gluckspilz", name: "Glückspilz", how: "Ein legendäres Teil finden", ok: (G) => SKINS.some((s) => s.rar === "SSR" && G.owned[s.id]) },
  { id: "garderobe", name: "Garderoben-Admin", how: "30 Skins sammeln", ok: (G) => SKINS.filter((s) => s.rar !== "S" && s.rar !== "EV" && G.owned[s.id]).length >= 30 },
  { id: "works-on-my-machine", name: "Works on my machine", how: "Zwei Geräte per Sync verbinden", ok: (_G, v) => v.synced() },
  { id: "rangliste", name: "Ranglisten-Rookie", how: "In der Rangliste mitmachen", ok: (_G, v) => v.lbJoined() },
] as Title[]).concat(ALL_EVENTS.filter((e) => e.reward.kind === "title").map((e) => ({ id: String(e.reward.id), name: e.reward.name, how: `Abschlusstest im Event „${e.kurz}“ bestehen – nur bis ${new Date(e.ende + "T12:00:00").toLocaleDateString("de-DE")}`, ev: e.id })));
/** Ohne Prototyp: „constructor“ o. Ä. ist kein Titel */
export const TI: Record<string, Title | undefined> = Object.assign(Object.create(null), Object.fromEntries(TITLES.map((t) => [t.id, t])));
