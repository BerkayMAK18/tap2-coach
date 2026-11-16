/** BezVisual: neutrales Bild vor der Antwort (ohne Lösung), Relationenmodell mit Pfeil FK → PK danach. */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BEZ } from "@/lib/beziehungen";
import { BezLoesung, BezVorher } from "./BezVisual";

const vor = (id: string | null, offen = false) => renderToStaticMarkup(createElement(BezVorher, { id, offen }));
const nach = (id: string | null, theorie = false) => renderToStaticMarkup(createElement(BezLoesung, { id, theorie }));

describe("BezVorher", () => {
  it("ohne Beispiel oder ohne Bild: nichts", () => {
    expect(vor("m0")).toBe("");
    expect(vor(null)).toBe("");
    expect(vor("m214")).toBe("");
    expect(vor("k:sql19")).toBe("");
  });
  it("m88: zwei Entitäten mit 1 und n, noch ohne Fremdschlüssel", () => {
    const h = vor("m88");
    expect(h).toContain(">Abteilung<");
    expect(h).toContain(">Mitarbeiter<");
    expect(h).toContain(">1<");
    expect(h).toContain(">n<");
    expect(h).not.toMatch(/AbteilungsNr|FK|Fremdschlüssel/);
  });
  it("verrät bei keinem Beispiel Spalten oder Schlüssel der Lösung", () => {
    BEZ.filter((b) => b.vorher).forEach((b) => b.refs.forEach((ref) => {
      const h = vor(ref);
      expect(h, ref).toContain('class="bz-er"');
      b.tabellen.flatMap((t) => t.spalten).forEach((c) => expect(h, `${ref}: ${c.n}`).not.toContain(`>${c.n}<`));
      expect(h, ref).not.toMatch(/>PK<|>FK<|bz-pfeil/);
      // Zwischentabelle (m:n) erst in der Lösung
      b.tabellen.filter((t) => t.name !== b.vorher!.a.t && t.name !== b.vorher!.b.t).forEach((t) => expect(h, ref).not.toContain(t.name));
    }));
  });
  it("m213: Kardinalität gesucht → „?“, nach der Antwort 1 und 1", () => {
    expect(vor("m213")).toContain(">?<");
    expect(vor("m213")).not.toContain(">1<");
    expect(vor("m213", true)).not.toContain(">?<");
    expect(vor("m213", true).match(/>1</g)).toHaveLength(2);
  });
  it("k:db17: Krähenfuß-Symbole, Lesart erst nach dem Aufdecken", () => {
    expect(vor("k:db17")).toContain('class="bz-kf"');
    expect(vor("k:db17")).toContain("<circle");
    expect(vor("k:db17")).not.toContain("0 bis n");
    expect(vor("k:db17", true)).toContain("0 bis n");
    expect(vor("k:db17", true)).toContain("genau 1");
  });
});

describe("BezLoesung", () => {
  it("ohne Beispiel: nichts", () => expect(nach("m0")).toBe(""));
  it("m88: Mini-Tabellen mit PK/FK und Pfeil FK → PK", () => {
    const h = nach("m88");
    expect(h).toContain('class="bz-pfeil"');
    expect(h).toContain(">AbteilungsNr<");
    expect(h).toContain(">MitarbeiterNr<");
    expect(h).toContain(">PK<");
    expect(h).toContain(">FK<");
    expect(h).toContain("Mitarbeiter.AbteilungsNr verweist auf Abteilung.AbteilungsNr");
    expect(h).not.toContain("bz-daten"); // keine Beispieldaten
  });
  it("m87: Zwischentabelle mit zwei Pfeilen und zusammengesetztem Schlüssel", () => {
    const h = nach("m87");
    expect(h).toContain(">Belegung<");
    expect(h.match(/class="bz-pfeil"/g)).toHaveLength(2);
    expect(h).toContain("Belegung(SchuelerNr PK FK, KursNr PK FK, Anmeldedatum)");
  });
  it("m213: UNIQUE am Fremdschlüssel mit Legende", () => {
    expect(nach("m213")).toContain(">UQ<");
    expect(nach("m213")).toContain("UNIQUE");
  });
  it("m94: Beispieldaten und abgelehntes INSERT/DELETE", () => {
    const h = nach("m94");
    expect(h).toContain("bz-daten");
    expect(h).toContain('class="bz-weg einfuegen"');
    expect(h).toContain('class="bz-weg loeschen"');
    expect(h).toContain("INSERT ✗");
    expect(h).toContain("DELETE ✗");
    expect(h).toContain("BuchNr 99");
  });
  it("Theorie: mehrere Beispiele mit Überschrift und aufgedecktem Beziehungsbild", () => {
    const h = nach("G03:Kardinalitäten lesen", true);
    expect(h.match(/<figure class="bz-rel">/g)).toHaveLength(3);
    expect(h.match(/class="bz-er"/g)).toHaveLength(3);
    expect(h).not.toContain(">?<");
    ["1:1", "1:n", "m:n"].forEach((a) => expect(h).toContain(`>${a}<`));
    expect(nach("m88")).not.toContain("<figcaption>"); // in der Lernrunde ohne Überschrift
  });
});
