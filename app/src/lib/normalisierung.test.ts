/**
 * Normalisierung visuell: Daten (src/content/normalisierung.json) und Logik.
 * Die Beispiele müssen zu den Katalog-Texten passen: jede Referenz existiert, die letzte Stufe enthält genau die
 * Relationen der Text-Musterlösung, Ausgangstabellen im Aufgabentext entsprechen der ersten Stufe.
 */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import raw from "@/content/normalisierung.json";
import { NormDatei, type NormBeispiel, type NormStufe } from "@/content/schema";
import { NORM, abhRaster, beziehungen, normFor, parseRelationen, pruefe, stufeName, stufenDiff, textBloecke } from "./normalisierung";

/** Text der Musterlösung bzw. Erklärung zu einer Referenz – dieselben Stellen, an denen die App die Darstellung zeigt */
function refText(ref: string): string | null {
  const u = TAP2.ueb.find((x) => x.id === ref); if (u) return u.loesung;
  const o = TAP2.open.find((x) => x.id === ref); if (o) return o.a;
  const q = TAP2.questions.find((x) => x.id === ref); if (q) return q.type === "card" ? q.a : q.why;
  const [pid, titel] = ref.split(":"), p = TAP2.pakete.find((x) => x.id === pid);
  const k = p?.kern.find((x) => x[0] === titel);
  return k ? k[1] : null;
}
const letzte = (b: NormBeispiel) => b.stufen[b.stufen.length - 1];

describe("Normalisierungs-Daten", () => {
  it("entsprechen dem Schema und sind vollständig geladen", () => {
    expect(NormDatei.safeParse(raw).success).toBe(true);
    expect(NORM.length).toBe((raw as { beispiele: unknown[] }).beispiele.length);
    expect(NORM.length).toBeGreaterThanOrEqual(7);
  });
  it("jede Referenz gibt es im Katalog, keine doppelt", () => {
    const refs = NORM.flatMap((b) => b.refs);
    expect(refs.filter((r, i) => refs.indexOf(r) !== i)).toEqual([]);
    expect(refs.filter((r) => refText(r) === null)).toEqual([]);
  });
  it("alle Beispiele sind plausibel (Schlüssel, Fremdschlüssel, kein Attribut verloren, Beispieldaten)", () => {
    expect(Object.fromEntries(NORM.map((b) => [b.titel, pruefe(b)]))).toEqual(Object.fromEntries(NORM.map((b) => [b.titel, []])));
  });
  it("die letzte Stufe enthält die Relationen der Text-Musterlösung (Namen, Spalten, PK/FK)", () => {
    NORM.forEach((b) => b.refs.forEach((ref) => {
      const end = letzte(b);
      parseRelationen(refText(ref)!).forEach((r) => {
        const t = end.tabellen.find((x) => x.name === r.name);
        expect(t, `${ref}: Tabelle ${r.name}`).toBeDefined();
        expect(t!.spalten.map((c) => c.n), `${ref}: ${r.name}`).toEqual(r.spalten.map((c) => c.n));
        r.spalten.forEach((c) => {
          const d = t!.spalten.find((x) => x.n === c.n)!;
          if (c.pk) expect(d.pk, `${ref}: ${r.name}.${c.n} PK`).toBe(true);
          if (c.fk) expect(!!d.fk, `${ref}: ${r.name}.${c.n} FK`).toBe(true);
        });
      });
    }));
  });
  it("D2: alle fünf Tabellen und alle Beziehungen der Musterlösung", () => {
    const b = normFor("D2")!, text = refText("D2")!;
    expect(letzte(b).tabellen.map((t) => t.name).sort()).toEqual(parseRelationen(text).map((r) => r.name).sort());
    const imText = [...text.matchAll(/([A-ZÄÖÜ]\w*) 1 ?: ?n ([A-ZÄÖÜ]\w*)/g)].map((m) => `${m[1]}>${m[2]}`).sort();
    expect(beziehungen(letzte(b)).map((x) => `${x.eins}>${x.viele}`).sort()).toEqual(imText);
  });
  it("Ausgangstabelle im Aufgabentext = erste Stufe (D2 und o83)", () => {
    ["D2", "o83"].forEach((ref) => {
      const u = TAP2.ueb.find((x) => x.id === ref) ?? TAP2.open.find((x) => x.id === ref);
      const tab = textBloecke((u as { text?: string; q?: string }).text ?? (u as { q: string }).q).find((x) => "kopf" in x);
      const t0 = normFor(ref)!.stufen[0].tabellen[0];
      expect(tab, ref).toEqual({ kopf: t0.spalten.map((c) => c.n), zeilen: t0.zeilen });
    });
  });
});

// ---------- Logik an kleinen Beispielen
const s = (nf: number, tabellen: NormStufe["tabellen"]): NormStufe => ({ nf, text: "x", tabellen });
const A1 = s(1, [{ name: "Belegung", spalten: [{ n: "SNr", pk: true }, { n: "KNr", pk: true }, { n: "Kursname" }, { n: "Note" }], zeilen: [["1", "D1", "DB", "2"]] }]);
const A2 = s(2, [
  { name: "Belegung", spalten: [{ n: "SNr", pk: true }, { n: "KNr", pk: true, fk: "Kurs" }, { n: "Note" }], zeilen: [["1", "D1", "2"]] },
  { name: "Kurs", spalten: [{ n: "KNr", pk: true }, { n: "Titel", aus: ["Kursname"] }, { n: "Raum", neu: true }], zeilen: [["D1", "DB", "R1"]] },
]);
const bsp = (stufen: NormStufe[], abh: NormBeispiel["abh"] = []): NormBeispiel => ({ titel: "T", refs: ["x"], abhIn: 0, abh, stufen });

describe("stufenDiff", () => {
  it("erste Stufe: alles bleibt, keine neue Tabelle", () => {
    const [t] = stufenDiff(undefined, A1);
    expect(t.neu).toBe(false);
    expect(t.spalten.map((c) => c.status)).toEqual(["bleibt", "bleibt", "bleibt", "bleibt"]);
  });
  it("erkennt neue Tabelle, verschobene, umbenannte, neue und entfernte Spalten", () => {
    const [bel, kurs] = stufenDiff(A1, A2);
    expect(bel.neu).toBe(false);
    expect(bel.spalten.map((c) => c.status)).toEqual(["bleibt", "bleibt", "bleibt"]);
    expect(bel.weg).toEqual([{ n: "Kursname", nach: ["Kurs"] }]);
    expect(kurs.neu).toBe(true);
    expect(kurs.spalten.map((c) => [c.n, c.status, c.von ?? "", (c.alt ?? []).join()])).toEqual([
      ["KNr", "verschoben", "Belegung", ""], ["Titel", "verschoben", "Belegung", "Kursname"], ["Raum", "neu", "", ""],
    ]);
  });
  it("umbenannt in derselben Tabelle (Aufteilen eines mehrwertigen Felds)", () => {
    const a = s(0, [{ name: "T", spalten: [{ n: "Nr", pk: true }, { n: "Liste", mehrwertig: true }], zeilen: [] }]);
    const b = s(1, [{ name: "T", spalten: [{ n: "Nr", pk: true }, { n: "Wert", pk: true, aus: ["Liste"] }], zeilen: [] }]);
    expect(stufenDiff(a, b)[0].spalten[1]).toMatchObject({ status: "umbenannt", alt: ["Liste"] });
  });
});

describe("pruefe", () => {
  it("gültiges Beispiel ohne Probleme", () => expect(pruefe(bsp([A1, A2], [{ von: ["KNr"], nach: ["Kursname"], art: "teilweise" }]))).toEqual([]));
  it("verlorenes Attribut, Spalte ohne Herkunft", () => {
    const B = s(2, [{ name: "Belegung", spalten: [{ n: "SNr", pk: true }, { n: "KNr", pk: true }, { n: "Note" }, { n: "Extra" }], zeilen: [] }]);
    expect(pruefe(bsp([A1, B]))).toEqual(["Stufe 1 (2. NF): Belegung.Kursname geht verloren", "Stufe 1 (2. NF) Belegung: Extra ohne Herkunft (neu: true oder aus: […] angeben)"]);
  });
  it("Fremdschlüssel ohne Ziel, falsche Zeilenlänge, doppelter Schlüssel, fehlender Wert im Ziel", () => {
    const B = s(2, [
      { name: "Belegung", spalten: [{ n: "SNr", pk: true }, { n: "KNr", pk: true, fk: "Kurs" }, { n: "Note" }], zeilen: [["1", "D9", "2"], ["1", "D9", "3"], ["2"]] },
      { name: "Kurs", spalten: [{ n: "KNr", pk: true }, { n: "Kursname" }], zeilen: [["D1", "DB"]] },
      { name: "X", spalten: [{ n: "Y", fk: "Nix" }, { n: "Z" }], zeilen: [] },
    ]);
    const p = pruefe(bsp([A1, B]));
    expect(p).toEqual(expect.arrayContaining([
      "Stufe 1 (2. NF) Belegung: Zeile 3 hat 1 statt 3 Werte",
      "Stufe 1 (2. NF) Belegung: Schlüssel 1|D9 doppelt",
      "Stufe 1 (2. NF) Belegung: KNr = D9 fehlt in Kurs",
      "Stufe 1 (2. NF) X: kein Primärschlüssel",
      "Stufe 1 (2. NF) X: Fremdschlüssel Y → unbekannte Tabelle Nix",
      "Stufe 1 (2. NF) X: Z ohne Herkunft (neu: true oder aus: […] angeben)",
    ]));
    expect(p.some((x) => x.includes("geht verloren"))).toBe(false);
  });
  it("mehrwertig ab der 1. NF, fallende Normalform, Abhängigkeit mit unbekannter Spalte", () => {
    const B = s(0, [{ name: "Belegung", spalten: [{ n: "SNr", pk: true }, { n: "KNr", pk: true }, { n: "Kursname", mehrwertig: true }, { n: "Note" }], zeilen: [] }]);
    const C = s(1, [{ name: "Belegung", spalten: [{ n: "SNr", pk: true }, { n: "KNr", pk: true }, { n: "Kursname", mehrwertig: true }, { n: "Note" }], zeilen: [] }]);
    expect(pruefe(bsp([A1, C], [{ von: ["Foo"], nach: ["Note"], art: "voll" }]))).toEqual([
      "Abhängigkeit: Spalte Foo fehlt in Belegung",
      "Stufe 1 (1. NF): Normalform muss steigen",
      "Stufe 1 (1. NF) Belegung: Kursname ist ab der 1. NF nicht erlaubt (mehrwertig)",
    ]);
    expect(pruefe(bsp([B]))).toEqual([]);
  });
});

describe("abhRaster", () => {
  it("markiert Determinante und abhängige Spalten, Linie nur zwischen äußerstem Paar", () => {
    const [r] = abhRaster(["A", "B", "C", "D"], [{ von: ["B"], nach: ["D"], art: "transitiv" }]);
    expect(r.map((z) => [z.mark, z.l, z.r])).toEqual([[null, false, false], ["von", false, true], [null, true, true], ["nach", true, false]]);
  });
  it("zusammengesetzte Determinante, Abhängige links davon", () => {
    const [r] = abhRaster(["X", "A", "B"], [{ von: ["A", "B"], nach: ["X"], art: "voll" }]);
    expect(r.map((z) => z.mark)).toEqual(["nach", "von", "von"]);
    expect(r.map((z) => [z.l, z.r])).toEqual([[false, true], [true, true], [true, false]]);
  });
});

describe("beziehungen", () => {
  it("1 : n auf der Seite des Fremdschlüssels, 1 : 1 wenn der FK allein der Schlüssel ist", () => {
    const st = s(3, [
      { name: "Kunde", spalten: [{ n: "KNr", pk: true }], zeilen: [] },
      { name: "Konto", spalten: [{ n: "KtoNr", pk: true }, { n: "KNr", fk: "Kunde" }], zeilen: [] },
      { name: "Profil", spalten: [{ n: "KNr", pk: true, fk: "Kunde" }], zeilen: [] },
    ]);
    expect(beziehungen(st)).toEqual([{ eins: "Kunde", viele: "Konto", ueber: "KNr", art: "1 : n" }, { eins: "Kunde", viele: "Profil", ueber: "KNr", art: "1 : 1" }]);
  });
});

describe("stufeName", () => {
  it("Ausgang, Ausgang mit NF, danach n. NF", () => {
    expect(stufeName(s(0, []), 0)).toBe("Ausgang");
    expect(stufeName(s(2, []), 0)).toBe("Ausgang (2. NF)");
    expect(stufeName(s(3, []), 1)).toBe("3. NF");
  });
});

describe("textBloecke", () => {
  it("zerlegt Text mit Tabelle in Absatz, Tabelle, Absatz", () => {
    expect(textBloecke("Tabelle:\n\nA | B\n1 | 2\n3 | 4\n\na) Frage")).toEqual([{ text: "Tabelle:" }, { kopf: ["A", "B"], zeilen: [["1", "2"], ["3", "4"]] }, { text: "a) Frage" }]);
  });
  it("einzelne Zeile mit | oder ungleiche Spaltenzahl bleibt Text", () => {
    expect(textBloecke("x || y")).toEqual([{ text: "x || y" }]);
    expect(textBloecke("A | B\n1 | 2 | 3")).toEqual([{ text: "A | B\n1 | 2 | 3" }]);
  });
  it("ohne Tabelle: genau ein Textblock, leer: keiner", () => {
    expect(textBloecke("Hallo\nWelt")).toEqual([{ text: "Hallo\nWelt" }]);
    expect(textBloecke("")).toEqual([]);
  });
});

describe("parseRelationen", () => {
  it("liest Schlüsselmarken, auch [PK, FK] mit Komma", () => {
    expect(parseRelationen("Auftragsposition (AuftragNr [PK, FK], Menge)\nKurs(KursNr, Kursname) auslagern")).toEqual([
      { name: "Auftragsposition", spalten: [{ n: "AuftragNr", pk: true, fk: true }, { n: "Menge", pk: false, fk: false }] },
      { name: "Kurs", spalten: [{ n: "KursNr", pk: false, fk: false }, { n: "Kursname", pk: false, fk: false }] },
    ]);
  });
  it("übergeht Klammern mit Fließtext", () => {
    expect(parseRelationen("eigene Tabelle (z. B. Telefon mit Fremdschlüssel) und Anmeldung   (m:n aufgelöst) Punkte (4 P)")).toEqual([]);
  });
});
