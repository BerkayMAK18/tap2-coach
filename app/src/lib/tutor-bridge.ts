/**
 * Tutor-Brücke zu einem Claude-Projekt (Claude Pro, keine API-Kosten).
 *
 * 1. buildKnowledgeMd(): Wissensdatei fürs Claude-Projekt aus dem Katalog (Themen, Lernpakete, Fallen, Ziele).
 * 2. INSTRUCTIONS: Projekt-Anweisungen – Tutor-Ablauf nach LearnHarness (Diagnose → Plan → Erklären → Transfer →
 *    Erkenntnis sichern) und das Format des Ergebnis-Blocks.
 * 3. buildHandoff(): Übergabe des aktuellen Wissensgraphen als Text zum Einfügen in den Chat.
 * 4. parseResult(): Ergebnis-Block aus Claude zurück in die App – wird als FREMDTEXT behandelt (Zod, Längen, nur
 *    bekannte Themen-IDs), damit nichts Schädliches in den Lernstand kommt.
 * Daten verlassen das Gerät nur, wenn der Nutzer sie selbst kopiert und in sein eigenes Claude-Konto einfügt.
 */
import { z } from "zod";
import type { Tap2Catalog } from "@/content/schema";
import type { KnowledgeGraph } from "./graph";
import { daysBetween, today } from "./dates";

export const RESULT_TAG = "tap2-ergebnis";

/** Wissen nur für ausgewählte Themen (In-App-Tutor: spart Tokens). Ohne Auswahl: alle Themen. */
export function buildKnowledgeFor(c: Tap2Catalog, topicIds: string[]): string {
  return buildKnowledgeMd({ ...c, topics: c.topics.filter((t) => topicIds.includes(t.id)) });
}

export function buildKnowledgeMd(c: Tap2Catalog): string {
  const PK = new Map(c.pakete.map((p) => [p.id, p]));
  const out: string[] = [
    "# TAP2-Wissen (FIAE) – Wissensbasis für den Tutor",
    "",
    "Quelle: TAP2 Prüfungscoach. Themen-IDs (T01 …) im Ergebnis-Block exakt so verwenden.",
    "",
  ];
  for (const t of c.topics) {
    out.push(`## ${t.id} · ${t.n}`, `Prüfungsteil: ${t.teil}${t.prio ? ` · Priorität: ${t.prio}` : ""}`, "");
    for (const pid of t.th) {
      const p = PK.get(pid); if (!p) continue;
      out.push(`### ${p.titel}`);
      if (p.relevanz) out.push(`*Prüfungsrelevanz:* ${p.relevanz}`);
      p.kern.forEach(([titel, text, code]) => { out.push(`**${titel}** – ${text}`); if (code) out.push("```", code, "```"); });
      if (p.fallen?.length) out.push("*Typische Fallen:*", ...p.fallen.map((f) => `- ${f}`));
      if (p.ziele?.length) out.push("*Lernziele:*", ...p.ziele.map((z) => `- ${z}`));
      out.push("");
    }
  }
  return out.join("\n");
}

export const INSTRUCTIONS = `Du bist mein persönlicher Tutor für die IHK-Abschlussprüfung Teil 2, Fachinformatiker Anwendungsentwicklung (FIAE).
Sprich Deutsch, duze mich, sei klar und geduldig. Nutze das bereitgestellte TAP2-Wissen (Projektdatei „TAP2-Wissen“ bzw. Abschnitt „Wissen“) als Wissensbasis und zitiere daraus, statt zu raten. Halte Antworten kurz (höchstens etwa 150 Wörter), außer ich bitte um mehr. Nenne Themen immer beim Namen, nie mit ihrer ID (T01 …) – die IDs gehören nur in den Ergebnis-Block.

Ablauf jeder Sitzung (wie LearnHarness):
1. Diagnose: Lies meine Übergabe (Wissensgraph). Stelle zu einem schwachen oder offenen Muss-Thema 1–2 Fragen im IHK-Stil, nacheinander. Unterstelle kein Wissen.
2. Plan: Sag in 2–3 Sätzen, woran wir arbeiten und warum.
3. Erklären: Schritt für Schritt, mit Beispiel aus der Prüfungspraxis. Verrate Lösungen nicht vorschnell – gib erst Hinweise.
4. Transfer: Eine neue Aufgabe, die ich selbst lösen muss. Bewerte wie ein IHK-Prüfer (Operator beachten: nennen, beschreiben, erläutern, beurteilen …; Punkte je Aspekt).
5. Erkenntnis sichern: Fasse zusammen, was ich nachweislich verstanden habe – nur mit Beleg aus meinen eigenen Antworten.

Am Ende jeder Sitzung (oder wenn ich „Ergebnis“ schreibe) gib GENAU EINEN Codeblock mit der Sprache ${RESULT_TAG} aus, nur JSON, ohne Kommentare:
\`\`\`${RESULT_TAG}
{"version":1,"verstanden":[{"thema":"T05","aussage":"kurze Aussage, was ich kann","beleg":"Zitat/Kurzfassung meiner Antwort"}],"fehlvorstellungen":[{"thema":"T05","aussage":"was ich falsch verstehe"}],"ueben":["T05","T02"]}
\`\`\`
Regeln für den Block: Themen-IDs nur aus der Wissensdatei (T01 …). „verstanden“ nur mit echtem Beleg. Höchstens 5 Einträge je Liste. Keine persönlichen Daten.`;

export function buildHandoff(g: KnowledgeGraph, examDay: string, insights: Insight[]): string {
  const pct = (n: number) => `${Math.round(n * 100)} %`;
  const left = daysBetween(today(), examDay);
  const topics = g.nodes.filter((n) => n.kind === "topic");
  const lines = [
    `Übergabe aus dem TAP2-Coach (${today()}). Prüfung in ${left} Tagen.`,
    "",
    "Wissensgraph je Thema (ID · Name · Reife · Einordnung · rot/neu):",
    ...topics.map((n) => `- ${n.id} · ${n.label} · ${pct(n.pct)} · ${n.level} · ${n.red} rot / ${n.fresh} neu${n.prio === "Muss" ? " · Muss" : ""}`),
    "",
    `Schwächen: ${g.weaknesses.map((n) => n.id).join(", ") || "keine"}`,
    `Offen (Muss zuerst): ${g.gaps.slice(0, 6).map((n) => n.id).join(", ") || "keine"}`,
    "",
    "Häufigste Fehler (Frage gekürzt):",
    ...g.errors.slice(0, 6).map((e) => `- [${e.topic}] ${e.q.replace(/\s+/g, " ").slice(0, 180)} (${e.wrong}× falsch)`),
  ];
  if (insights.length) lines.push("", "Bisher belegt verstanden:", ...insights.slice(-8).map((i) => `- [${i.thema}] ${i.aussage}`));
  lines.push("", "Starte bitte mit der Diagnose.");
  return lines.join("\n");
}

const short = (n: number) => z.string().trim().min(1).max(n);
const ResultSchema = z.object({
  version: z.literal(1),
  verstanden: z.array(z.object({ thema: z.string(), aussage: short(300), beleg: short(400) })).max(10).default([]),
  fehlvorstellungen: z.array(z.object({ thema: z.string(), aussage: short(300) })).max(10).default([]),
  ueben: z.array(z.string()).max(10).default([]),
});
export type Insight = { thema: string; aussage: string; beleg: string; at: string };
export type Misconception = { thema: string; aussage: string; at: string };
export type TutorResult = { verstanden: Insight[]; fehlvorstellungen: Misconception[]; ueben: string[] };

/** Ergebnis-Block aus Claudes Antwort lesen. Akzeptiert die ganze Antwort oder nur den Block. */
export function parseResult(text: string, knownTopics: Set<string>): TutorResult {
  if (text.length > 50000) throw new Error("Der Text ist zu lang.");
  const m = new RegExp("```" + RESULT_TAG + "\\s*([\\s\\S]*?)```").exec(text);
  const json = (m ? m[1] : text).trim();
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error("Kein gültiger Ergebnis-Block gefunden. Kopiere den Block, der mit ```" + RESULT_TAG + " beginnt."); }
  const r = ResultSchema.safeParse(raw);
  if (!r.success) throw new Error("Der Ergebnis-Block hat ein unbekanntes Format.");
  const ok = (t: string) => knownTopics.has(t), at = today();
  return {
    verstanden: r.data.verstanden.filter((i) => ok(i.thema)).slice(0, 5).map((i) => ({ ...i, at })),
    fehlvorstellungen: r.data.fehlvorstellungen.filter((i) => ok(i.thema)).slice(0, 5).map((i) => ({ ...i, at })),
    ueben: [...new Set(r.data.ueben.filter(ok))].slice(0, 5),
  };
}
