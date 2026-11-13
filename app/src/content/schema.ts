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

export const Aufgabe = z.object({ id: z.string(), teil: z.string(), thema: z.string(), titel: z.string(), max: z.number(), min: z.number(), text: z.string(), loesung: z.string() });
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
