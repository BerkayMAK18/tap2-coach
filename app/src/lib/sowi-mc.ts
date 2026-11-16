/**
 * SoWi beim Lernen nur als Multiple Choice (wie in der Prüfung): Karteikarten eines SoWi-Themas werden zur
 * Auswahlfrage – richtig ist die (ggf. gekürzte) Musterantwort, falsch sind drei plausible Antworten aus content/sowi-mc.
 * Gleiche ID, gleicher Fortschritt; Antwortreihenfolge mischt die Lernrunde wie bei jeder Auswahlfrage.
 */
import type { McQuestion, Question } from "@/content/schema";
import { SOWI_DISTRACTORS, SOWI_RIGHT } from "@/content/sowi-mc";

/** Karte → Auswahlfrage, wenn es eine SoWi-Karte mit Ablenkern ist; sonst unverändert */
export function asLernQ(q: Question, isSowi: (topic: string) => boolean): Question {
  if (q.type !== "card" || !isSowi(q.topic)) return q;
  const d = SOWI_DISTRACTORS[q.id];
  if (!d) return q;
  // Position der richtigen Antwort fest je Frage (die Runde mischt die Anzeige ohnehin)
  const right = [...q.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 4;
  const opts = [...d]; opts.splice(right, 0, SOWI_RIGHT[q.id] ?? q.a);
  const mc: McQuestion = { id: q.id, type: "mc", topic: q.topic, q: q.q, opts, right, why: `Musterlösung: ${q.a}${q.note ? " " + q.note : ""}` };
  return mc;
}
