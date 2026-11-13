/**
 * SQL ausführen (Abschnitt „SQL ausführen“ der Live-App): SQLite im Browser (sql.js) mit Beispiel-Datenbank.
 * Jede Ausführung startet mit einer frischen Datenbank. Bewertung: Ergebnis mit dem der Musterlösung vergleichen –
 * Reihenfolge der Zeilen und Spaltennamen egal. Reine Funktionen; das Laden von sql.js steht in sql-load.ts.
 */
import type { SqlCard } from "@/content/schema";

/** Kleinster gemeinsamer Nenner von sql.js (Typen, damit wir kein @types-Paket brauchen). */
export type SqlSet = { columns: string[]; values: unknown[][] };
export type SqlDatabase = { exec: (sql: string) => SqlSet[]; close: () => void };
export type SqlStatic = { Database: new () => SqlDatabase };
export type SqlResult = { sets: SqlSet[]; changed: number; error: string | null; check: SqlSet[] | null };
export type Verdict = { ok: boolean; why: string };

export const sqlShim = (c: string) => String(c || "").replace(/\bSTART\s+TRANSACTION\b/gi, "BEGIN TRANSACTION"); // MySQL-Schreibweise für SQLite

/** Fehlermeldungen von SQLite auf Deutsch und mit Tipp. */
export function sqlGerman(msg: unknown, tables: string[]) {
  const s = String(msg || "").replace(/^Error:\s*/, "");
  let m: RegExpMatchArray | null;
  if ((m = s.match(/no such table: (\S+)/))) return `Die Tabelle „${m[1]}“ gibt es nicht. Vorhanden: ${tables.join(", ")}.`;
  if ((m = s.match(/no such column: (\S+)/))) return `Die Spalte „${m[1]}“ gibt es nicht. Tipp: Schreibweise und Tabellen-Alias prüfen.`;
  if ((m = s.match(/ambiguous column name: (\S+)/))) return `Die Spalte „${m[1]}“ ist mehrdeutig (in mehreren Tabellen). Mit Tabellenname oder Alias davor schreiben, z. B. k.${m[1]}.`;
  if ((m = s.match(/near "([^"]*)": syntax error/))) return `Syntaxfehler bei „${m[1]}“.`;
  if (/incomplete input/.test(s)) return "Die Anweisung ist unvollständig (fehlt eine Klammer oder ein Teil der Abfrage?).";
  if (/FOREIGN KEY constraint failed/.test(s)) return "Fremdschlüssel verletzt: Es gibt noch abhängige Datensätze (oder der referenzierte Datensatz fehlt). Abhängige Zeilen zuerst löschen bzw. anlegen.";
  if ((m = s.match(/UNIQUE constraint failed: (\S+)/))) return `Schlüssel doppelt: ${m[1]} muss eindeutig sein.`;
  if ((m = s.match(/NOT NULL constraint failed: (\S+)/))) return `${m[1]} darf nicht leer (NULL) sein.`;
  if ((m = s.match(/table (\S+) already exists/))) return `Die Tabelle ${m[1]} gibt es schon.`;
  if (/misuse of aggregate/.test(s)) return "Aggregatfunktion an falscher Stelle, z. B. COUNT/SUM im WHERE statt im HAVING.";
  if (/must appear in the GROUP BY|not an aggregate/.test(s)) return "Jede Spalte im SELECT muss im GROUP BY stehen oder aggregiert sein.";
  return s;
}

export function runSQL(SQL: SqlStatic, seed: string, tables: string[], code: string, cfg: SqlCard = {}): SqlResult {
  const db = new SQL.Database(), out: SqlResult = { sets: [], changed: 0, error: null, check: null };
  const total = () => Number(db.exec("SELECT total_changes()")[0].values[0][0]);
  try {
    db.exec("PRAGMA foreign_keys = ON;\n" + seed + (cfg.pre ? "\n" + cfg.pre : ""));
    const before = total();
    try { out.sets = db.exec(sqlShim(code)); } catch (e) { out.error = sqlGerman((e as Error).message, tables); }
    out.changed = total() - before;
    if (cfg.check && !out.error) { try { out.check = db.exec(cfg.check); } catch { out.check = []; } }
  } finally { db.close(); }
  return out;
}

export const sqlV = (v: unknown) => (v === null || v === undefined ? "∅" : typeof v === "number" ? String(Math.round(v * 1e6) / 1e6) : String(v));
/** Ergebnismengen vergleichen: Reihenfolge der Zeilen egal, Spaltennamen egal, vertauschte Spalten erlaubt. */
export function sqlSame(a: SqlSet[] | null, b: SqlSet[] | null): Verdict {
  if (!a || !b) return { ok: false, why: "Kein Ergebnis zum Vergleichen." };
  if (a.length !== b.length) return { ok: false, why: `Du lieferst ${a.length} Ergebnistabelle(n), erwartet ${b.length === 1 ? "ist eine" : "sind " + b.length}.` };
  let swapped = false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.columns.length !== y.columns.length) return { ok: false, why: `Dein Ergebnis hat ${x.columns.length} Spalten, erwartet sind ${y.columns.length}.` };
    if (x.values.length !== y.values.length) return { ok: false, why: `Dein Ergebnis hat ${x.values.length} Zeilen, erwartet sind ${y.values.length}.` };
    const key = (r: unknown[]) => r.map(sqlV).join("\u0001");
    const ks = (s: SqlSet) => s.values.map(key).sort().join("\u0002");
    if (ks(x) === ks(y)) continue;
    const ks2 = (s: SqlSet) => s.values.map((r) => r.map(sqlV).sort().join("\u0001")).sort().join("\u0002");
    if (ks2(x) === ks2(y)) { swapped = true; continue; }
    return { ok: false, why: "Gleich viele Zeilen und Spalten, aber mindestens ein Wert ist anders." };
  }
  return { ok: true, why: swapped ? "Nur die Reihenfolge der Spalten ist anders, das ist in Ordnung." : "" };
}
const lastSet = (sets: SqlSet[] | null) => (sets && sets.length ? [sets[sets.length - 1]] : []);
/** Bewertung gegen die Musterlösung (null = keine Musterlösung oder eigener Fehler). */
export function sqlVerdict(SQL: SqlStatic, seed: string, tables: string[], r: SqlResult, cfg: SqlCard): Verdict | null {
  if (!cfg.sol || r.error) return null;
  const e = runSQL(SQL, seed, tables, cfg.sol, cfg);
  return cfg.check ? sqlSame(r.check, e.check) : sqlSame(lastSet(r.sets), lastSet(e.sets));
}
