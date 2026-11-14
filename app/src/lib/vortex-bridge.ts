/**
 * Vortex (kostenlos): Brücke zur eigenen KI – kein Server, keine API-Kosten.
 *
 * 1. bridgePrompt(): EIN Text zum Kopieren – Prüfer-Anweisungen (wie Vortex Pro), Übergabe (Stand je Konzept,
 *    Fehlvorstellungen, Lernpakete des Themas) und das Format des Ergebnis-Blocks. Der Nutzer fügt ihn selbst in eine KI
 *    seiner Wahl ein (Claude, ChatGPT …). Die App überträgt dabei nichts.
 * 2. parseBridge(): Ergebnis-Block zurück in die App – FREMDTEXT: Zod, Längen, nur bekannte Themen-/Konzept-IDs.
 *    Daraus werden Belege für Graph und Lehrplan (gleiches Format wie bei Vortex Pro) und bewertete Aufgaben für XP.
 *    Die IDs der Belege hängen nur vom Inhalt des Blocks ab: Zweimal einfügen zählt nur einmal (auch für XP).
 */
import { z } from "zod";
import { OPERATOR_LIST, type Operator } from "./tutor-schema";
import { fvSlug, SICHER, type Sicher } from "./tutor-session";
import type { Ev } from "./tutor-state";

export const BRIDGE_TAG = "vortex-ergebnis";

export const BRIDGE_INSTRUCTIONS = `Du bist „Vortex“, mein Prüfungstutor und Prüfer für die IHK-Abschlussprüfung Teil 2, Fachinformatiker Anwendungsentwicklung (FIAE). Du sprichst Deutsch, duzt mich und bist klar, fair und knapp.

# Sitzung
Diese Sitzung gilt genau einem Thema (siehe Übergabe unten, mit meinem Stand je Konzept, offenen Fehlvorstellungen und den Inhalten der Lernpakete). Löchere mich die ganze Sitzung zu diesem Thema, prüfungsähnlich im IHK-Stil:
- Beginne mit einer Aufgabe zu einem schwachen oder offenen Konzept. Steigere die Anforderung (Operatoren der Stufen I → II → III) und wechsle die Konzepte. Offene Fehlvorstellungen prüfst du gezielt nach.
- Immer nur eine Aufgabe gleichzeitig, dann wartest du auf meine Antwort.
- Jede Aufgabe mit Kennung (A1, A2 …), Operator, Punkten (meist 2–12) und Ausgangsmaterial (Tabelle als Markdown-Tabelle, Code als Codeblock, Geschäftsregeln als Liste).

# Bewerten wie ein IHK-Prüfer
- Lege beim Stellen für dich einen Erwartungshorizont fest (Aspekte mit Punkten) und verrate ihn nicht vorher.
- Bewerte meine Antwort genau daran: Teilpunkte je Aspekt mit Begründung („2 von 4 P.: Die Definition stimmt, es fehlt …“), halbe Punkte sind erlaubt.
- Achte auf den Operator: Nennen = Stichworte; Beschreiben = Zusammenhang in Sätzen; Erläutern/Erklären = mit Begründung oder Beispiel; Vergleichen = Gemeinsamkeiten und Unterschiede; Begründen/Beurteilen/Bewerten = eigenes, begründetes Urteil. Wird der Operator nicht erfüllt, gibt es Abzug.
- Verrate die Lösung nicht vorschnell. Nach der Bewertung nennst du, was fehlt, und gibst höchstens einen Hinweis.
- Schreibe ich „Ich stehe auf dem Schlauch“, gib mir einen kleineren Teilschritt oder ein Gerüst – nicht die Lösung.
- Nenne ich einen Gedankengang, ist das eine Hilfe für dich, keine Antwort. Nenne ich meine Sicherheit (geraten / unsicher / ziemlich sicher / sicher): sicher, aber falsch ist ein starkes Zeichen für eine Fehlvorstellung.

# Ergebnis
Wenn ich „Ergebnis“ schreibe oder etwa 8 Aufgaben geschafft sind, gib GENAU EINEN Codeblock mit der Sprache ${BRIDGE_TAG} aus, nur JSON, ohne Kommentare:
\`\`\`${BRIDGE_TAG}
{"version":2,"thema":"T03","aufgaben":[{"id":"A1","titel":"kurzer Titel","operator":"Erläutern","punkte":3,"max":4,"konzepte":["P04.2"],"sicherheit":"sicher"}],"graph":[{"konzept":"P04.2","art":"luecke","staerke":-0.3,"notiz":"woran du das siehst","fehlvorstellung":"","fehl_id":""}],"fazit":"zwei Sätze"}
\`\`\`
Regeln für den Block: thema = Themen-ID der Übergabe. konzepte und konzept nur mit Kernaussagen-IDs aus der Übergabe (z. B. P04.2). aufgaben = jede bewertete Aufgabe mit erreichten Punkten (punkte) und Höchstpunkten (max); sicherheit = was ich angegeben habe (geraten, unsicher, ziemlich sicher, sicher) oder null. graph.art = beleg (sitzt, staerke > 0), luecke (fehlt, staerke < 0), fehlvorstellung (mit Text und stabiler fehl_id), behoben (Fehlvorstellung ausgeräumt, gleiche fehl_id). Nur, was meine Antworten belegen. Keine persönlichen Daten.`;

/** Der Text zum Kopieren: Anweisungen + Übergabe (aus makeHandoff) */
export const bridgePrompt = (handoff: string) => `${BRIDGE_INSTRUCTIONS}\n\n---\n\n${handoff.replace(/Gehe kurz auf meine erste Nachricht unten ein[^\n]*/, "Beginne jetzt: ein Satz zur Begrüßung, dann die erste Aufgabe.")}`;

// ---------- Ergebnis-Block lesen
const t = (n: number) => z.string().trim().min(1).max(n);
const Aufg = z.object({
  id: z.string().trim().max(20).optional(), titel: t(120), operator: z.string().optional(),
  punkte: z.number().min(0).max(25), max: z.number().min(1).max(25),
  konzepte: z.array(z.string()).max(6).default([]), sicherheit: z.string().nullish(),
});
const Graph = z.object({
  konzept: z.string(), art: z.enum(["beleg", "luecke", "fehlvorstellung", "behoben"]), staerke: z.number().min(-1).max(1),
  notiz: z.string().trim().max(300).optional(), fehlvorstellung: z.string().trim().max(300).optional(), fehl_id: z.string().trim().max(40).optional(),
});
const Block = z.object({
  version: z.literal(2), thema: z.string(),
  aufgaben: z.array(z.unknown()).max(20).default([]), graph: z.array(z.unknown()).max(20).default([]),
  fazit: z.string().trim().max(800).optional(),
});
export type BridgeTask = { titel: string; operator?: Operator; punkte: number; max: number; konzepte: string[]; sich?: Sicher; ev: string };
export type BridgeResult = { thema: string; hash: string; tasks: BridgeTask[]; evidence: Ev[]; fazit?: string; skipped: number };

/** FNV-1a (32 Bit) – feste Kennung aus dem Inhalt des Blocks */
export function hashText(s: string) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
const SICHER_IDX = (s: unknown): Sicher | undefined => { const i = SICHER.indexOf(String(s ?? "").trim().toLowerCase() as (typeof SICHER)[number]); return i >= 0 ? (i as Sicher) : undefined; };
const kid = (s: string | undefined) => (s && /^[A-Za-z0-9_.-]{1,40}$/.test(s) ? s : undefined);

/**
 * Ergebnis-Block aus der Antwort der KI lesen (ganze Antwort oder nur der Block). Wirft mit verständlicher Meldung.
 * topicOf: Konzept-ID → Themen-ID; nur Konzepte des Themas im Block zählen. now = Zeitpunkt der Belege.
 */
export function parseBridge(text: string, known: { topics: Set<string>; kern: Set<string> }, topicOf: (k: string) => string | undefined, now: number): BridgeResult {
  if (text.length > 60000) throw new Error("Der Text ist zu lang. Kopiere nur den Ergebnis-Block.");
  const m = new RegExp("```" + BRIDGE_TAG + "\\s*([\\s\\S]*?)```").exec(text);
  const json = (m ? m[1] : text).trim();
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error(`Kein gültiger Ergebnis-Block gefunden. Schreib der KI „Ergebnis“ und kopiere den Block, der mit \`\`\`${BRIDGE_TAG} beginnt.`); }
  const b = Block.safeParse(raw);
  if (!b.success) throw new Error("Der Ergebnis-Block hat ein unbekanntes Format (version 2 erwartet).");
  if (!known.topics.has(b.data.thema)) throw new Error("Unbekanntes Thema im Ergebnis-Block.");
  const thema = b.data.thema, hash = hashText(JSON.stringify(raw)), okK = (k: string) => known.kern.has(k) && topicOf(k) === thema;
  const tasks: BridgeTask[] = [], evidence: Ev[] = []; let skipped = 0;
  b.data.aufgaben.forEach((x, i) => {
    const r = Aufg.safeParse(x); if (!r.success) { skipped++; return; }
    const a = r.data, max = a.max, punkte = Math.min(a.punkte, max), sich = SICHER_IDX(a.sicherheit), ks = a.konzepte.filter(okK).slice(0, 4);
    const op = OPERATOR_LIST.find((o) => o.toLowerCase() === String(a.operator ?? "").trim().toLowerCase());
    const evId = `vb-${hash}-a${i}`, w = punkte / max;
    (ks.length ? ks : [undefined]).forEach((k, j) => evidence.push({ id: `${evId}-${j}`, at: now, ...(k ? { k } : {}), t: thema, art: "bewertung", w, p: punkte, m: max, ...(sich != null ? { sich } : {}), n: a.titel.slice(0, 300), s: `vb-${hash}` }));
    // Sicher, aber falsch → Fehlvorstellung (wie bei Vortex Pro)
    if (sich != null && sich >= 2 && w < 0.5) (ks.length ? ks : [undefined]).forEach((k, j) => evidence.push({ id: `${evId}-sf${j}`, at: now, ...(k ? { k } : {}), t: thema, art: "fehlvorstellung", w: -0.5, f: `sf-vb-${hash}-${i}`, n: `Sicher, aber falsch: ${a.titel}`.slice(0, 300), s: `vb-${hash}` }));
    tasks.push({ titel: a.titel, ...(op ? { operator: op } : {}), punkte, max, konzepte: ks, ...(sich != null ? { sich } : {}), ev: `${evId}-0` });
  });
  b.data.graph.forEach((x, i) => {
    const r = Graph.safeParse(x); if (!r.success || !okK(r.data.konzept)) { skipped++; return; }
    const g = r.data, isF = g.art === "fehlvorstellung" || g.art === "behoben";
    const f = isF ? kid(g.fehl_id) ?? (g.fehlvorstellung ? fvSlug(g.fehlvorstellung) : undefined) : undefined;
    if ((g.art === "fehlvorstellung" && !g.fehlvorstellung) || (g.art === "behoben" && !f)) { skipped++; return; }
    const n = (g.art === "fehlvorstellung" ? g.fehlvorstellung || g.notiz : g.notiz || g.fehlvorstellung)?.slice(0, 300);
    evidence.push({ id: `vb-${hash}-g${i}`, at: now, k: g.konzept, t: thema, art: g.art, w: g.staerke, ...(f ? { f } : {}), ...(n ? { n } : {}), s: `vb-${hash}` });
  });
  return { thema, hash, tasks, evidence, ...(b.data.fazit ? { fazit: b.data.fazit } : {}), skipped };
}
