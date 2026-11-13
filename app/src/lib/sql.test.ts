/** SQL ausführen: Musterlösungen laufen, Vergleich wie in der Live-App (Reihenfolge egal, Spaltennamen egal). */
import { beforeAll, describe, expect, it } from "vitest";
import initSqlJs from "sql.js";
import { TAP2 } from "@/content/catalog";
import { runSQL, sqlGerman, sqlSame, sqlVerdict, type SqlStatic } from "./sql";

const { seed, tables: T, cards } = TAP2.sqlDb, tables = T.map((t) => t[0]);
let SQL: SqlStatic;
beforeAll(async () => { SQL = (await initSqlJs()) as SqlStatic; });

describe("Beispiel-Datenbank", () => {
  it("liefert die Beispieldaten", () => {
    const r = runSQL(SQL, seed, tables, "SELECT * FROM Kunde;");
    expect(r.error).toBeNull();
    expect(r.sets[0].columns).toEqual(["KID", "Name", "Ort", "Email"]);
    expect(r.sets[0].values).toHaveLength(6);
  });
  it("jede Musterlösung läuft fehlerfrei und stimmt mit sich selbst überein", () => {
    Object.entries(cards).forEach(([id, cfg]) => {
      if (!cfg.sol) return;
      const r = runSQL(SQL, seed, tables, cfg.sol, cfg);
      expect(r.error, id).toBeNull();
      expect(sqlVerdict(SQL, seed, tables, r, cfg)?.ok, id).toBe(true);
    });
  });
  it("Änderungen zählen, Prüfabfrage zeigt den Zustand danach (k:sql8)", () => {
    const cfg = cards["k:sql8"], r = runSQL(SQL, seed, tables, cfg.sol!, cfg);
    expect(r.changed).toBe(3);
    expect(r.check![0].values.find((v) => v[0] === 104)![3]).toBeCloseTo(27.39);
  });
  it("START TRANSACTION (MySQL) läuft auch in SQLite", () => {
    expect(runSQL(SQL, seed, tables, cards["k:sql25"].sol!, cards["k:sql25"]).error).toBeNull();
  });
  it("Fehler auf Deutsch", () => {
    expect(runSQL(SQL, seed, tables, "SELECT * FROM Kunden;").error).toBe("Die Tabelle „Kunden“ gibt es nicht. Vorhanden: Kunde, Artikel, Bestellung, Position, Mitarbeiter, Konto.");
    expect(runSQL(SQL, seed, tables, "SELECT Nam FROM Kunde;").error).toMatch(/^Die Spalte „Nam“ gibt es nicht/);
    expect(sqlGerman("Error: near \"FORM\": syntax error", tables)).toBe("Syntaxfehler bei „FORM“.");
  });
});

describe("Ergebnisvergleich", () => {
  const set = (columns: string[], values: unknown[][]) => [{ columns, values }];
  it("Reihenfolge der Zeilen und Spaltennamen sind egal", () => {
    expect(sqlSame(set(["a", "b"], [[1, "x"], [2, "y"]]), set(["A", "B"], [[2, "y"], [1, "x"]]))).toEqual({ ok: true, why: "" });
  });
  it("vertauschte Spalten sind in Ordnung, mit Hinweis", () => {
    expect(sqlSame(set(["a", "b"], [[1, "x"]]), set(["b", "a"], [["x", 1]]))).toEqual({ ok: true, why: "Nur die Reihenfolge der Spalten ist anders, das ist in Ordnung." });
  });
  it("nennt den Grund einer Abweichung", () => {
    expect(sqlSame(set(["a"], [[1]]), set(["a", "b"], [[1, 2]])).why).toBe("Dein Ergebnis hat 1 Spalten, erwartet sind 2.");
    expect(sqlSame(set(["a"], [[1]]), set(["a"], [[1], [2]])).why).toBe("Dein Ergebnis hat 1 Zeilen, erwartet sind 2.");
    expect(sqlSame(set(["a"], [[1]]), set(["a"], [[2]])).why).toBe("Gleich viele Zeilen und Spalten, aber mindestens ein Wert ist anders.");
    expect(sqlSame([], set(["a"], [[1]])).why).toBe("Du lieferst 0 Ergebnistabelle(n), erwartet ist eine.");
  });
  it("Kleine Rundungsunterschiede zählen nicht", () => {
    expect(sqlSame(set(["p"], [[27.390000000001]]), set(["p"], [[27.39]])).ok).toBe(true);
  });
  it("eine falsche Abfrage zu k:sql3 wird erkannt (INNER statt LEFT JOIN)", () => {
    const cfg = cards["k:sql3"], r = runSQL(SQL, seed, tables, "SELECT K.Name, COUNT(B.BID) FROM Kunde K JOIN Bestellung B ON B.KID = K.KID GROUP BY K.KID, K.Name;", cfg);
    expect(sqlVerdict(SQL, seed, tables, r, cfg)).toEqual({ ok: false, why: "Dein Ergebnis hat 4 Zeilen, erwartet sind 6." });
  });
});
