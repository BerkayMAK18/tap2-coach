/** Prüfer-Tutor: Werkzeug-Eingabe als Fremdtext – Zod, Längen, nur bekannte IDs, Material nur als Daten. */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { kbIds, makeKb, paketeOf } from "./tutor-kb";
import { parseRunde } from "./tutor-schema";

const kb = makeKb(TAP2), ids = kbIds(kb);
const T = "T03", P = paketeOf(kb, T)[0], K1 = `${P}.1`, K2 = `${P}.2`;
const aufgabe = (o: Record<string, unknown> = {}) => ({
  id: "A1", titel: "Normalisierung", operator: "Erläutern", punkte: 4, stellung: "Erläutern Sie die 2NF.", konzepte: [K1, "P999.1"],
  material: [
    { art: "tabelle", titel: "Bestellung", kopf: ["BestNr", "Kunde"], zeilen: [["1", "Meier"], ["2", "<b>Müller</b>"]] },
    { art: "code", titel: "", sprache: "sql", code: "SELECT * FROM t;" },
    { art: "regeln", titel: "Regeln", punkte: ["Ein Kunde hat viele Bestellungen."] },
    { art: "text", titel: "", text: "Ausgangslage" },
  ],
  erwartung: [{ aspekt: "Definition", punkte: 2 }, { aspekt: "Beispiel", punkte: 2 }],
  ...o,
});

describe("parseRunde", () => {
  it("gültige Runde: Aufgabe mit allen Materialarten, unbekannte Konzepte fallen weg (mit Hinweis)", () => {
    const { runde, probleme } = parseRunde({ nachricht: "Los geht's.", phase: "aufgabe", aufgabe: aufgabe() }, ids);
    expect(runde?.aufgabe?.material.map((m) => m.art)).toEqual(["tabelle", "code", "regeln", "text"]);
    expect(runde?.aufgabe?.konzepte).toEqual([K1]);
    expect(probleme).toEqual(["unbekannte Konzepte in aufgabe: P999.1"]);
    // HTML bleibt Text (die App rendert Zellen als Text, nie als HTML)
    const t = runde!.aufgabe!.material[0]; expect(t.art === "tabelle" && t.zeilen[1][1]).toBe("<b>Müller</b>");
  });
  it("ohne gültige Nachricht wird nichts übernommen", () => {
    expect(parseRunde({ phase: "aufgabe", aufgabe: aufgabe() }, ids).runde).toBeNull();
    expect(parseRunde({ nachricht: "x".repeat(4001) }, ids).runde).toBeNull();
    expect(parseRunde("kaputt", ids).runde).toBeNull();
  });
  it("Längen und Grenzen: zu langes Material fällt einzeln weg, die Aufgabe bleibt", () => {
    const { runde, probleme } = parseRunde({ nachricht: "x", phase: "aufgabe", aufgabe: aufgabe({ material: [{ art: "code", titel: "", sprache: "sql", code: "x".repeat(4001) }, { art: "html", html: "<script>" }, { art: "text", titel: "", text: "ok" }] }) }, ids);
    expect(runde?.aufgabe?.material).toEqual([{ art: "text", titel: "", text: "ok" }]);
    expect(probleme.filter((p) => p.startsWith("material")).length).toBe(2);
  });
  it("unbekannter Operator oder zu viele Punkte → Aufgabe verworfen", () => {
    expect(parseRunde({ nachricht: "x", aufgabe: aufgabe({ operator: "Tanzen" }) }, ids).runde?.aufgabe).toBeUndefined();
    expect(parseRunde({ nachricht: "x", aufgabe: aufgabe({ punkte: 99 }) }, ids).runde?.aufgabe).toBeUndefined();
  });
  it("Erwartungshorizont muss die Punkte ergeben (Hinweis an den Tutor)", () => {
    const { probleme } = parseRunde({ nachricht: "x", aufgabe: aufgabe({ konzepte: [K1], erwartung: [{ aspekt: "a", punkte: 1 }] }) }, ids);
    expect(probleme).toEqual(["erwartung ergibt 1 statt 4 Punkte"]);
  });
  it("Bewertung: Punkte höchstens max, Teilpunkte höchstens ihr max", () => {
    const { runde } = parseRunde({ nachricht: "x", phase: "bewertung", bewertung: { aufgabe: "A1", punkte: 7, max: 4, teile: [{ aspekt: "a", punkte: 3, max: 2, begruendung: "b" }], fehlt: "", operator_erfuellt: true } }, ids);
    expect(runde?.bewertung?.punkte).toBe(4); expect(runde?.bewertung?.teile[0].punkte).toBe(2);
  });
  it("Graph: nur bekannte Konzepte, Fehlvorstellung braucht Text, leere fehl_id gilt als fehlend, höchstens 8", () => {
    const g = (o: Record<string, unknown>) => ({ konzept: K1, art: "beleg", staerke: 0.4, notiz: "", fehlvorstellung: "", fehl_id: "", ...o });
    const { runde, probleme } = parseRunde({ nachricht: "x", graph: [g({}), g({ konzept: "T03" }), g({ art: "fehlvorstellung" }), g({ konzept: K2, art: "fehlvorstellung", fehlvorstellung: "2NF = keine Wiederholungsgruppen", fehl_id: "nf-2" }), g({ staerke: 3 })] }, ids);
    expect(runde?.graph.map((x) => [x.konzept, x.art, x.fehl_id])).toEqual([[K1, "beleg", undefined], [K2, "fehlvorstellung", "nf-2"]]);
    expect(probleme.length).toBe(3);
    expect(parseRunde({ nachricht: "x", graph: Array.from({ length: 12 }, () => g({})) }, ids).runde?.graph.length).toBe(8);
  });
});
