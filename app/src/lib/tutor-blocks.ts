/**
 * Strukturierte Blöcke in Tutor-Antworten (Tutor-Ansicht: Chat + rechte Leiste).
 *
 * - ```tap2-aufgabe {…}```  – die Aufgabe, die der Tutor gerade stellt (rechts unter „Aufgabe“).
 * - ```tap2-stand {…}```    – seine Einschätzung je Thema nach Lehrplan (rechts unter „Lernstand“).
 * - ```tap2-ergebnis {…}``` – Abschluss der Sitzung (belegte Erkenntnisse, Übungsthemen; lib/tutor-bridge.ts).
 *
 * KI-Antworten sind Fremdtext: Blöcke werden mit Zod geprüft, auf bekannte Themen-IDs und feste Längen beschränkt
 * und nie als HTML ausgegeben. Kaputte Blöcke werden ignoriert, der Chat läuft weiter.
 */
import { z } from "zod";
import { today } from "./dates";
import type { Level } from "./graph";

export const TASK_TAG = "tap2-aufgabe", STAND_TAG = "tap2-stand";

const txt = (n: number) => z.string().trim().min(1).max(n);
const TaskSchema = z.object({
  thema: z.string().max(20).optional(),
  titel: txt(120),
  operator: z.string().trim().max(40).optional(),
  punkte: z.number().int().min(0).max(100).optional(),
  text: txt(3000),
  hinweis: z.string().trim().max(600).optional(),
});
const StandSchema = z.object({
  themen: z.array(z.object({ thema: z.string().max(20), stufe: z.enum(["stark", "festigen", "schwach", "offen"]), notiz: z.string().trim().max(300).optional() })).max(30),
});

export type TutorTask = z.infer<typeof TaskSchema> & { at: string };
export type StandEntry = { stufe: Level; notiz?: string; at: string };

const blockRe = (tag: string) => new RegExp("```" + tag + "[ \\t]*\\n?([\\s\\S]*?)```", "g");
function lastBlock(text: string, tag: string): unknown {
  let m: RegExpExecArray | null, last: string | null = null;
  const re = blockRe(tag);
  while ((m = re.exec(text))) last = m[1];
  if (last == null) return undefined;
  try { return JSON.parse(last.trim()); } catch { return undefined; }
}

/** Aufgabe aus einer Antwort (letzter gültiger Block), nur mit bekanntem Thema oder ohne Thema */
export function parseTask(text: string, known: Set<string>): TutorTask | null {
  const r = TaskSchema.safeParse(lastBlock(text, TASK_TAG));
  if (!r.success) return null;
  const t = r.data;
  return { ...t, thema: t.thema && known.has(t.thema) ? t.thema : undefined, at: today() };
}
/** Einschätzung je Thema (nur bekannte Themen, je Thema der letzte Eintrag) */
export function parseStand(text: string, known: Set<string>): Record<string, StandEntry> {
  const r = StandSchema.safeParse(lastBlock(text, STAND_TAG));
  if (!r.success) return {};
  const out: Record<string, StandEntry> = {};
  r.data.themen.filter((x) => known.has(x.thema)).forEach((x) => { out[x.thema] = { stufe: x.stufe, ...(x.notiz ? { notiz: x.notiz } : {}), at: today() }; });
  return out;
}
/** Text für die Chat-Blase: Aufgaben- und Stand-Blöcke stehen rechts in der Leiste, nicht im Chat */
export const stripBlocks = (text: string) => text.replace(blockRe(TASK_TAG), "").replace(blockRe(STAND_TAG), "").replace(/\n{3,}/g, "\n\n").trim();

/** Zusatz zu den Tutor-Anweisungen: Format der Blöcke für die rechte Leiste */
export const BLOCK_INSTRUCTIONS = `
Die App zeigt neben dem Chat eine Leiste mit „Aufgabe“ und „Lernstand“. Dafür gilt zusätzlich:
- Wenn du mir eine Aufgabe oder Frage stellst, die ich beantworten soll, hänge GENAU EINEN Block an (nur JSON):
\`\`\`${TASK_TAG}
{"thema":"T05","titel":"kurzer Titel","operator":"Erläutern","punkte":4,"text":"vollständiger Aufgabentext wie in der Prüfung","hinweis":"optional: Tipp, ohne die Lösung zu verraten"}
\`\`\`
  Den Aufgabentext schreibst du trotzdem auch normal in deine Antwort.
- Wenn sich deine Einschätzung zu einem Thema ändert (nach meiner Antwort oder der Diagnose), hänge einen Block an:
\`\`\`${STAND_TAG}
{"themen":[{"thema":"T05","stufe":"schwach","notiz":"kurz: was fehlt oder sitzt"}]}
\`\`\`
  Stufen: stark, festigen, schwach, offen. Nur Themen, zu denen du etwas Neues weißt; Themen-IDs nur aus dem Wissen/der Übergabe.`;
