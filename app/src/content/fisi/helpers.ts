import type { CardQuestion, McQuestion } from "../schema";

const HINT: Record<string, string> = {
  Nennen: "Stichworte genügen",
  Angeben: "Stichworte genügen",
  Beschreiben: "Zusammenhang in ganzen Sätzen",
  Erläutern: "mit Begründung oder Beispiel",
  Begründen: "mit nachvollziehbarer Begründung",
  Beurteilen: "eigenes, begründetes Urteil",
  Vergleichen: "Gemeinsamkeiten und Unterschiede",
  Unterscheiden: "Unterschiede klar benennen",
  Berechnen: "Rechenweg und Ergebnis",
  Bestimmen: "Ergebnis mit Herleitung",
  Ordnen: "Zuordnung mit Begründung",
};

/** [Situation, Aufgabe (beginnt mit dem Operator), Punkte, Aspekte der Musterlösung] */
export type Karte = [situation: string, aufgabe: string, punkte: number, aspekte: string[]];
/** [Frage, richtige Antwort, drei falsche Antworten, Erklärung] */
export type Mc = [frage: string, richtig: string, falsch: [string, string, string], warum: string];

const nr = (i: number) => String(i + 1).padStart(2, "0");

export const karten = (slug: string, topic: string, rows: Karte[]): CardQuestion[] =>
  rows.map(([situation, aufgabe, punkte, aspekte], i) => {
    const op = aufgabe.split(" ")[0];
    return {
      id: `fisi:card:${slug}-${nr(i)}`,
      type: "card",
      topic,
      q: `${situation ? situation + "\n\n" : ""}${aufgabe} (${punkte} P.)`,
      a: aspekte.map((x) => "• " + x).join("\n"),
      note: `${punkte} P.: je richtigem Aspekt 1 P., höchstens ${punkte} P. Operator „${op}“: ${HINT[op] ?? "sachlich vollständig"}.`,
      code: false,
    };
  });

/** Position der richtigen Antwort hängt stabil an der ID, damit sie nicht immer vorn steht. */
export const mcs = (slug: string, topic: string, rows: Mc[]): McQuestion[] =>
  rows.map(([frage, richtig, falsch, warum], i) => {
    const id = `fisi:mc:${slug}-${nr(i)}`;
    const pos = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 4;
    const opts = [...falsch];
    opts.splice(pos, 0, richtig);
    return { id, type: "mc", topic, q: frage, opts, right: pos, why: warum };
  });
