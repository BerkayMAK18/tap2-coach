/**
 * Katalog-Format (schema 1) – die Grundlage der Katalog-Bibliothek.
 *
 * Ein Katalog ist eine JSON-Datei in src/content/generated/ (später auch aus einer Bibliothek geladen).
 * Die Schemas werden in catalog.test.ts gegen alle Dateien geprüft, damit ein fehlerhafter Export
 * nie in die App gelangt. Neue Felder: hier optional ergänzen, dann im Export-Skript befüllen.
 *
 * Frage-IDs sind die Schlüssel des Lernstands. Sie müssen eindeutig sein und dürfen sich nie ändern.
 */
import { z } from "zod";

export const QID = z.string().regex(/^[A-Za-z0-9:_-]{1,60}$/);

export const McQuestion = z.object({
  id: QID,
  type: z.literal("mc"),
  topic: z.string(),
  teil: z.string().optional(),
  cat: z.string().optional(),
  q: z.string(),
  opts: z.array(z.string()).min(2),
  right: z.number().int().nonnegative(),
  why: z.string(),
});
export const CardQuestion = z.object({
  id: QID,
  type: z.literal("card"),
  topic: z.string(),
  deck: z.string().optional(),
  q: z.string(),
  a: z.string(),
  note: z.string().default(""),
  code: z.boolean().default(false),
});
export const Question = z.discriminatedUnion("type", [McQuestion, CardQuestion]);
export type McQuestion = z.infer<typeof McQuestion>;
export type CardQuestion = z.infer<typeof CardQuestion>;
export type Question = z.infer<typeof Question> & { own?: boolean };

export const Topic = z.object({
  id: z.string(),
  n: z.string(),
  teil: z.string(),
  prio: z.string().optional(),
  ic: z.string().optional(),
  th: z.array(z.string()),
  decks: z.array(z.string()),
  cats: z.array(z.string()),
});
export type Topic = z.infer<typeof Topic>;

export const Paket = z.object({
  id: z.string(),
  titel: z.string(),
  teil: z.string(),
  prio: z.string().optional(),
  h: z.number().optional(),
  relevanz: z.string().optional(),
  kern: z.array(z.union([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string(), z.string()])])), // [Titel, Text, optional Codebeispiel]
  fallen: z.array(z.string()).optional(),
  ziele: z.array(z.string()).optional(),
  svg: z.string().optional(), // Schlüssel der Notationshilfe (notation)
  decks: z.array(z.string()).optional(),
  ueb: z.array(z.string()).optional(),
  quiz: z.unknown().optional(),
  alt: z.unknown().optional(),
});
export type Paket = z.infer<typeof Paket>;

export const Aufgabe = z.object({ id: z.string(), teil: z.string(), thema: z.string(), titel: z.string(), max: z.number(), min: z.number(), text: z.string(), loesung: z.string(), schema: z.boolean().optional() }); // schema: Tabellen der SQL-Beispieldatenbank anzeigen
export type Aufgabe = z.infer<typeof Aufgabe>;

export const OpenQuestion = z.object({ id: z.string(), teil: z.string(), cat: z.string(), p: z.number(), q: z.string(), a: z.string() }).passthrough();
export type OpenQuestion = z.infer<typeof OpenQuestion>;

/** Notationshilfe zu einem Lernpaket (eigenes SVG aus dem Katalog). */
export const Notation = z.object({ titel: z.string(), svg: z.string(), hinweis: z.string() });
export type Notation = z.infer<typeof Notation>;

/** SQL-Karte: sol = ausführbare Musterlösung (Ergebnisvergleich), pre = Vorbereitung, check = Abfrage für den Zustand danach,
 *  checkT = Überschrift dazu, note/free = Hinweis, norun = nicht ausführbar (Begründung). */
export const SqlCard = z.object({ sol: z.string().optional(), pre: z.string().optional(), check: z.string().optional(), checkT: z.string().optional(), note: z.string().optional(), free: z.string().optional(), norun: z.string().optional() });
export type SqlCard = z.infer<typeof SqlCard>;
export const SqlDb = z.object({ seed: z.string(), tables: z.array(z.tuple([z.string(), z.string()])), cards: z.record(z.string(), SqlCard), note: z.string() });
export type SqlDb = z.infer<typeof SqlDb>;

export const Figure = z.object({ svg: z.string().startsWith("<svg"), caption: z.string() });

/** Operator-Trainer: Aufgabe mit drei Antworten, genau eine erfüllt den Operator (OPDRILLS der Live-App) */
export const OpDrill = z.object({ op: z.string(), q: z.string(), opts: z.array(z.string()).length(3), right: z.number().int().min(0).max(2), why: z.string() });
export type OpDrill = z.infer<typeof OpDrill>;
/** Stufe der Operator-Treppe: [Stufe, Name, [Operator, Anforderung, Beispiel][]] (OP_LADDER) */
export const OpStufe = z.tuple([z.string(), z.string(), z.array(z.tuple([z.string(), z.string(), z.string()]))]);
export type OpStufe = z.infer<typeof OpStufe>;

export const Tap2Catalog = z.object({
  schema: z.literal(1),
  id: z.string(),
  titel: z.string(),
  art: z.string(),
  tags: z.array(z.string()),
  quelle: z.object({ datei: z.string(), hash: z.string() }),
  sqlSchema: z.string(),
  topics: z.array(Topic),
  decks: z.record(z.string(), z.object({ n: z.string(), teil: z.string() }).passthrough()),
  cats: z.record(z.string(), z.record(z.string(), z.string())),
  pakete: z.array(Paket),
  ueb: z.array(Aufgabe),
  open: z.array(OpenQuestion),
  notation: z.record(z.string(), Notation),
  figs: z.record(z.string(), Figure),
  icons: z.record(z.string(), z.string()),
  sqlDb: SqlDb,
  codeLang: z.record(z.string(), z.enum(["pseudo", "sql"])),
  operatoren: z.object({ drills: z.array(OpDrill), ladder: z.array(OpStufe) }),
  questions: z.array(Question),
});
export type Tap2Catalog = z.infer<typeof Tap2Catalog>;

export const EventCatalog = z.object({
  schema: z.literal(1),
  id: z.string(),
  kurz: z.string(),
  titel: z.string(),
  sub: z.string().optional(),
  start: z.string(),
  ende: z.string(),
  art: z.literal("event"),
  enabled: z.boolean(),
  tags: z.array(z.string()),
  reward: z.object({ kind: z.string(), name: z.string() }).passthrough(),
  info: z.string().optional(),
  tipps: z.array(z.string()).optional(),
  kapitel: z.array(z.object({ id: z.string(), titel: z.string(), lern: z.array(z.tuple([z.string(), z.string()])), fig: z.string().optional(), items: z.array(Question) })),
});
export type EventCatalog = z.infer<typeof EventCatalog>;

export const CatalogIndex = z.object({
  schema: z.literal(1),
  quelle: z.object({ datei: z.string(), hash: z.string() }),
  kataloge: z.array(z.object({ id: z.string(), datei: z.string(), titel: z.string(), art: z.string(), enabled: z.boolean(), tags: z.array(z.string()), fragen: z.number(), ende: z.string().optional() })),
});

/**
 * Normalisierung visuell (nur neue App): Beispiele in src/content/normalisierung.json, zugeordnet über Katalog-IDs
 * (Aufgabe „D2“, offene Frage „o83“, Karte „k:db0“, MC „m85“, Lernpaket-Abschnitt „P04:Normalformen“).
 * Nur Daten – die App stellt sie selbst als Tabellen und Diagramme dar, nie als HTML.
 * Spalte: pk/fk (Zieltabelle derselben Stufe), aus = Spalten der Vorstufe, aus denen sie entsteht (umbenannt/aufgeteilt),
 * neu = kommt ohne Vorlage hinzu (künstlicher Schlüssel, Menge), mehrwertig = nicht atomar (verletzt die 1. NF).
 */
const NormName = z.string().regex(/^[A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]{0,39}$/);
export const NormSpalte = z.object({
  n: NormName,
  pk: z.boolean().optional(),
  fk: NormName.optional(),
  aus: z.array(NormName).min(1).optional(),
  neu: z.boolean().optional(),
  mehrwertig: z.boolean().optional(),
});
export const NormTabelle = z.object({ name: NormName, spalten: z.array(NormSpalte).min(1).max(10), zeilen: z.array(z.array(z.string().max(80))).max(8).default([]) });
/** Funktionale Abhängigkeit von → nach; art: voll (in Ordnung), teilweise (verletzt 2. NF), transitiv (verletzt 3. NF) */
export const NormAbh = z.object({ von: z.array(NormName).min(1), nach: z.array(NormName).min(1), art: z.enum(["voll", "teilweise", "transitiv"]) });
export const NormStufe = z.object({ nf: z.number().int().min(0).max(3), text: z.string().min(1).max(400), tabellen: z.array(NormTabelle).min(1).max(6) });
export const NormBeispiel = z.object({
  titel: z.string().min(1).max(80),
  refs: z.array(z.string().min(1)).min(1),
  abhIn: z.number().int().min(0).default(0), // Stufe, auf deren (einziger) Tabelle die Abhängigkeiten gezeigt werden
  abh: z.array(NormAbh).default([]),
  stufen: z.array(NormStufe).min(1).max(4),
});
export const NormDatei = z.object({ schema: z.literal(1), beispiele: z.array(NormBeispiel) });
export type NormSpalte = z.infer<typeof NormSpalte>;
export type NormTabelle = z.infer<typeof NormTabelle>;
export type NormAbh = z.infer<typeof NormAbh>;
export type NormStufe = z.infer<typeof NormStufe>;
export type NormBeispiel = z.infer<typeof NormBeispiel>;

/**
 * Beziehungen visuell (nur neue App): Beispiele in src/content/beziehungen.json, zugeordnet über Katalog-IDs
 * (MC „m88“, Karte „k:db8“, Lernpaket-Abschnitt „P04:m:n-Beziehungen auflösen“). Nur Daten, kein HTML.
 * - vorher: neutrales Beziehungsbild für die Frage (Entitäten + Kardinalitäten, noch ohne Fremdschlüssel);
 *   verdeckt = Kardinalitäten als „?“ (wenn genau sie gefragt sind); null = kein Bild vor der Antwort
 * - tabellen: Lösung als Relationenmodell (PK/FK, FK nennt die Zieltabelle), Reihenfolge = Anordnung von links nach rechts
 * - abgelehnt: Beispiel für referentielle Integrität (Einfügen mit unbekanntem Schlüssel, Löschen eines referenzierten Datensatzes)
 */
export const BezSpalte = z.object({ n: NormName, pk: z.boolean().optional(), fk: NormName.optional(), unique: z.boolean().optional() });
export const BezTabelle = z.object({ name: NormName, spalten: z.array(BezSpalte).min(1).max(8), zeilen: z.array(z.array(z.string().max(40))).max(5).default([]) });
/** Ende einer Beziehungslinie: Entität, Höchstzahl (1, n, m) und optional Mindestzahl (für Krähenfuß/Min-Max) */
export const BezEnde = z.object({ t: NormName, k: z.enum(["1", "n", "m"]), min: z.union([z.literal(0), z.literal(1)]).optional() });
export const BezVorher = z.object({
  a: BezEnde,
  b: BezEnde,
  verdeckt: z.boolean().optional(),
  notation: z.enum(["zahl", "kraehenfuss"]).default("zahl"),
});
export const BezAbgelehnt = z.object({
  art: z.enum(["einfuegen", "loeschen"]),
  tabelle: NormName,
  zeile: z.array(z.string().max(40)).min(1),
  grund: z.string().min(1).max(160),
});
export const BezBeispiel = z.object({
  titel: z.string().min(1).max(80),
  refs: z.array(z.string().min(1)).min(1),
  vorher: BezVorher.nullable(),
  tabellen: z.array(BezTabelle).min(2).max(3),
  abgelehnt: z.array(BezAbgelehnt).max(2).default([]),
});
export const BezDatei = z.object({ schema: z.literal(1), beispiele: z.array(BezBeispiel) });
export type BezSpalte = z.infer<typeof BezSpalte>;
export type BezTabelle = z.infer<typeof BezTabelle>;
export type BezEnde = z.infer<typeof BezEnde>;
export type BezVorher = z.infer<typeof BezVorher>;
export type BezAbgelehnt = z.infer<typeof BezAbgelehnt>;
export type BezBeispiel = z.infer<typeof BezBeispiel>;
