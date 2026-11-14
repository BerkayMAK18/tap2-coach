/**
 * Prüfer-Tutor: Schema der Werkzeug-Eingabe „pruefer_runde“ (Fremddaten aus der KI).
 *
 * Das Werkzeug selbst (Name, JSON-Schema, Anweisungen) legt allein der Server fest (supabase/functions/tutor/index.ts) –
 * der Browser schickt keine Werkzeuge mit. Hier wird jede Runde mit Zod geprüft: feste Längen, nur bekannte Themen- und
 * Konzept-IDs, Material nur als Daten (Tabelle, Code, Regeln, Text), das die App selbst darstellt – nie HTML aus der KI.
 * Abschnitte werden einzeln geprüft: Ein kaputter Graph-Eintrag kostet nicht die ganze Aufgabe. Was verworfen wird, geht als
 * Hinweis an den Tutor zurück (tool_result), damit er es korrigiert.
 *
 * Gleichlauf mit dem Server: tutor-tool.test.ts liest das JSON-Schema aus der Edge Function und vergleicht die Felder.
 */
import { z } from "zod";

export const TOOL_NAME = "pruefer_runde";

/** Operatoren der IHK (Operator-Treppe des Katalogs) mit Anforderungsbereich */
export const OPERATOREN = {
  Nennen: "I", Angeben: "I",
  Beschreiben: "II", Darstellen: "II", Erklären: "II", Erläutern: "II", Vergleichen: "II", Unterscheiden: "II",
  Berechnen: "II", Erstellen: "II", Entwickeln: "II", Ergänzen: "II",
  Begründen: "III", Beurteilen: "III", Bewerten: "III", Abwägen: "III",
} as const;
export type Operator = keyof typeof OPERATOREN;
export const OPERATOR_LIST = Object.keys(OPERATOREN) as Operator[];
export const SPRACHEN = ["pseudocode", "sql", "java", "python", "csharp", "javascript", "text"] as const;
export const GRAPH_ARTEN = ["beleg", "luecke", "fehlvorstellung", "behoben"] as const;
export const PHASEN = ["aufgabe", "bewertung", "hilfe", "antwort", "abschluss"] as const;

const t = (max: number) => z.string().trim().min(1).max(max);
const opt = (max: number) => z.string().trim().max(max).optional();
/** Kurze, stabile Kennung (Aufgaben-ID, Fehlvorstellungs-ID) */
const kid = z.string().trim().regex(/^[A-Za-z0-9_.-]{1,40}$/);

export const Material = z.discriminatedUnion("art", [
  z.object({ art: z.literal("tabelle"), titel: opt(100), kopf: z.array(z.string().trim().max(60)).min(1).max(8), zeilen: z.array(z.array(z.string().trim().max(200)).max(8)).max(25) }),
  z.object({ art: z.literal("code"), titel: opt(100), sprache: z.enum(SPRACHEN), code: t(4000) }),
  z.object({ art: z.literal("regeln"), titel: opt(100), punkte: z.array(t(300)).min(1).max(15) }),
  z.object({ art: z.literal("text"), titel: opt(100), text: t(2000) }),
]);
export type Material = z.infer<typeof Material>;

const AufgabeZ = z.object({
  id: kid,
  titel: t(100),
  operator: z.enum(OPERATOR_LIST as [Operator, ...Operator[]]),
  punkte: z.number().int().min(1).max(25),
  stellung: t(2000),
  konzepte: z.array(z.string()).max(4).default([]),
  material: z.array(z.unknown()).max(4).default([]),
  erwartung: z.array(z.object({ aspekt: t(200), punkte: z.number().min(0).max(25) })).min(1).max(10),
});
const BewertungZ = z.object({
  aufgabe: kid,
  punkte: z.number().min(0).max(25),
  max: z.number().min(1).max(25),
  teile: z.array(z.object({ aspekt: t(200), punkte: z.number().min(0).max(25), max: z.number().min(0).max(25), begruendung: t(400) })).max(10).default([]),
  fehlt: opt(500),
  operator_erfuellt: z.boolean().optional(),
});
const GraphZ = z.object({
  konzept: z.string(),
  art: z.enum(GRAPH_ARTEN),
  staerke: z.number().min(-1).max(1),
  notiz: opt(300),
  fehlvorstellung: opt(300),
  fehl_id: z.preprocess((v) => (v === "" ? undefined : v), kid.optional()), // strenges Schema: leerer Text statt Weglassen
});
const AbschlussZ = z.object({ fazit: t(600), naechstes: opt(300) });

export type Aufgabe = Omit<z.infer<typeof AufgabeZ>, "material"> & { material: Material[] };
export type Bewertung = z.infer<typeof BewertungZ>;
export type GraphUpdate = z.infer<typeof GraphZ>;
export type Runde = {
  nachricht: string;
  phase: (typeof PHASEN)[number];
  aufgabe?: Aufgabe;
  bewertung?: Bewertung;
  graph: GraphUpdate[];
  abschluss?: z.infer<typeof AbschlussZ>;
};
export type KnownIds = { topics: Set<string>; kern: Set<string> };

const issue = (e: z.ZodError) => e.issues.slice(0, 2).map((i) => `${i.path.join(".") || "Eingabe"}: ${i.message}`).join("; ").slice(0, 200);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Werkzeug-Eingabe prüfen. Gibt die gültigen Teile und Hinweise zu verworfenen Teilen zurück.
 * runde = null, wenn nicht einmal die Nachricht gültig ist (dann zeigt die App nichts aus dieser Runde).
 */
export function parseRunde(input: unknown, ids: KnownIds): { runde: Runde | null; probleme: string[] } {
  const x = rec(input), probleme: string[] = [];
  const msg = t(4000).safeParse(x.nachricht);
  if (!msg.success) return { runde: null, probleme: ["nachricht fehlt oder ist zu lang (max. 4000 Zeichen)"] };
  const ph = z.enum(PHASEN).safeParse(x.phase);
  const runde: Runde = { nachricht: msg.data, phase: ph.success ? ph.data : "antwort", graph: [] };
  if (!ph.success && x.phase !== undefined) probleme.push("phase unbekannt");

  if (x.aufgabe != null) {
    const a = AufgabeZ.safeParse(x.aufgabe);
    if (!a.success) probleme.push("aufgabe verworfen – " + issue(a.error));
    else {
      const material: Material[] = [];
      a.data.material.forEach((m, i) => { const r = Material.safeParse(m); if (r.success) material.push(r.data); else probleme.push(`material[${i}] verworfen – ${issue(r.error)}`); });
      const bad = a.data.konzepte.filter((k) => !ids.kern.has(k));
      if (bad.length) probleme.push("unbekannte Konzepte in aufgabe: " + bad.join(", "));
      const summe = a.data.erwartung.reduce((s, e) => s + e.punkte, 0);
      if (Math.abs(summe - a.data.punkte) > 0.01) probleme.push(`erwartung ergibt ${summe} statt ${a.data.punkte} Punkte`);
      runde.aufgabe = { ...a.data, konzepte: a.data.konzepte.filter((k) => ids.kern.has(k)), material };
    }
  }
  if (x.bewertung != null) {
    const b = BewertungZ.safeParse(x.bewertung);
    if (!b.success) probleme.push("bewertung verworfen – " + issue(b.error));
    else runde.bewertung = { ...b.data, punkte: Math.min(b.data.punkte, b.data.max), teile: b.data.teile.map((p) => ({ ...p, punkte: Math.min(p.punkte, p.max) })) };
  }
  if (x.graph != null) {
    const list = Array.isArray(x.graph) ? x.graph.slice(0, 8) : [];
    if (!Array.isArray(x.graph)) probleme.push("graph muss eine Liste sein");
    if (Array.isArray(x.graph) && x.graph.length > 8) probleme.push("graph: höchstens 8 Einträge");
    list.forEach((g, i) => {
      const r = GraphZ.safeParse(g);
      if (!r.success) { probleme.push(`graph[${i}] verworfen – ${issue(r.error)}`); return; }
      if (!ids.kern.has(r.data.konzept)) { probleme.push(`graph[${i}]: unbekanntes Konzept ${r.data.konzept.slice(0, 20)}`); return; }
      if (r.data.art === "fehlvorstellung" && !r.data.fehlvorstellung) { probleme.push(`graph[${i}]: fehlvorstellung braucht einen Text`); return; }
      runde.graph.push(r.data);
    });
  }
  if (x.abschluss != null) {
    const r = AbschlussZ.safeParse(x.abschluss);
    if (r.success) runde.abschluss = r.data; else probleme.push("abschluss verworfen – " + issue(r.error));
  }
  return { runde, probleme };
}
