/**
 * Wissensbasis des Tutors – vollständig aus dem Katalog der App (Knowledge Base des TAP2 Coach), keine eigenen Inhalte.
 *
 * Struktur (feste IDs, auf die sich Lehrplan, Fragen und Belege beziehen):
 *   Prüfungsteil → Thema (T01 …) → Lernpaket (P01 …) → Kernaussage (P01.1 …)
 * Dazu je Lernpaket Prüfungsrelevanz, typische Fallen und Lernziele.
 *
 * Zwei Fassungen für den Tutor:
 * - kbOverview(): alle Themen mit Lernpaketen und Titeln der Kernaussagen (kompakt – für Diagnose und Planung)
 * - kbDetail(): volle Inhalte ausgewählter Lernpakete (für das Lernen entlang des Lehrplans)
 */
import type { Paket, Tap2Catalog, Topic } from "@/content/schema";

export type Kb = { topics: Topic[]; pakete: Map<string, Paket>; topicOf: Map<string, string> };
export function makeKb(c: Pick<Tap2Catalog, "topics" | "pakete">): Kb {
  const pakete = new Map(c.pakete.map((p) => [p.id, p])), topicOf = new Map<string, string>();
  c.topics.forEach((t) => t.th.forEach((p) => { if (!topicOf.has(p)) topicOf.set(p, t.id); }));
  return { topics: c.topics, pakete, topicOf };
}
/** Gültige IDs: Themen, Lernpakete, Kernaussagen */
export const kbIds = (kb: Kb) => ({
  topics: new Set(kb.topics.map((t) => t.id)),
  pakete: new Set(kb.pakete.keys()),
  kern: new Set([...kb.pakete.values()].flatMap((p) => p.kern.map((_, i) => `${p.id}.${i + 1}`))),
});

const teilOf = (t: Topic) => (t.teil === "SoWi" ? "WiSo" : t.teil);

/** Überblick über die ganze Wissensbasis (für Diagnose und Lehrplan) */
export function kbOverview(kb: Kb): string {
  const out = ["# Wissensbasis (Überblick)", "Struktur: Thema → Lernpaket → Kernaussagen. IDs exakt so in den Werkzeugen verwenden.", ""];
  for (const t of kb.topics) {
    out.push(`## ${t.id} · ${t.n} (${teilOf(t)}${t.prio ? ", " + t.prio : ""})`);
    t.th.forEach((pid) => {
      const p = kb.pakete.get(pid); if (!p) return;
      out.push(`- ${p.id} ${p.titel}: ${p.kern.map((k, i) => `${p.id}.${i + 1} ${k[0]}`).join(" · ")}`);
    });
  }
  return out.join("\n");
}
/** Volle Inhalte ausgewählter Lernpakete (für das Lernen) */
export function kbDetail(kb: Kb, paketIds: string[]): string {
  const out = ["# Wissensbasis (Inhalte für diesen Lehrplan)", "Erkläre und frage nur auf dieser Grundlage. Belege mit den IDs der Kernaussagen.", ""];
  [...new Set(paketIds)].forEach((pid) => {
    const p = kb.pakete.get(pid); if (!p) return;
    const t = kb.topics.find((x) => x.id === kb.topicOf.get(pid));
    out.push(`## ${p.id} ${p.titel}${t ? ` (Thema ${t.id} · ${t.n})` : ""}`);
    if (p.relevanz) out.push(`Prüfungsrelevanz: ${p.relevanz}`);
    p.kern.forEach(([titel, text, code], i) => { out.push(`- ${p.id}.${i + 1} **${titel}**: ${text}`); if (code) out.push("```", code, "```"); });
    if (p.fallen?.length) out.push("Typische Fallen:", ...p.fallen.map((f) => `- ${f}`));
    if (p.ziele?.length) out.push("Lernziele:", ...p.ziele.map((z) => `- ${z}`));
    out.push("");
  });
  return out.join("\n");
}
/** Lernpakete eines Themas */
export const paketeOf = (kb: Kb, tid: string) => kb.topics.find((t) => t.id === tid)?.th.filter((p) => kb.pakete.has(p)) ?? [];
