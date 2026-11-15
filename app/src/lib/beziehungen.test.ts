/**
 * Beziehungen visuell: Daten (src/content/beziehungen.json) und Logik.
 * Die Beispiele müssen zu den Katalog-Texten passen: jede Referenz existiert, das Bild vor der Antwort nennt nur
 * Entitäten aus der Frage, und Tabellen/Schlüssel aus Erklärung bzw. Musterlösung stehen so auch im Relationenmodell.
 */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import raw from "@/content/beziehungen.json";
import { BezDatei, type BezBeispiel, type BezTabelle } from "@/content/schema";
import { BEZ, artVon, bezFor, boxBreite, endText, erLayout, erQuerMin, kanten, pruefeBez, relLayout } from "./beziehungen";
import { parseRelationen } from "./normalisierung";

/** Fragetext und Erklärung/Musterlösung zu einer Referenz; Lernpaket-Abschnitte als „P04:Titel“ (Titel darf „:“ enthalten) */
function refTexte(ref: string): { q: string; a: string } | null {
  const q = TAP2.questions.find((x) => x.id === ref);
  if (q) return { q: q.q, a: q.type === "card" ? q.a : q.why };
  const i = ref.indexOf(":"), p = TAP2.pakete.find((x) => x.id === ref.slice(0, i));
  const k = p?.kern.find((x) => x[0] === ref.slice(i + 1));
  return k ? { q: k[0], a: k[1] } : null;
}
const ohneUmlaut = (s: string) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
const tab = (b: BezBeispiel, n: string) => b.tabellen.find((t) => t.name === n);

describe("Beziehungs-Daten", () => {
  it("entsprechen dem Schema und sind vollständig geladen", () => {
    expect(BezDatei.safeParse(raw).success).toBe(true);
    expect(BEZ.length).toBe((raw as { beispiele: unknown[] }).beispiele.length);
    expect(BEZ.length).toBeGreaterThanOrEqual(10);
  });
  it("jede Referenz gibt es im Katalog; Fragen hängen an genau einem Beispiel", () => {
    const refs = BEZ.flatMap((b) => b.refs);
    expect(refs.filter((r) => refTexte(r) === null)).toEqual([]);
    const fragen = refs.filter((r) => !/^[A-Z]\d\d:/.test(r));
    expect(fragen.filter((r, i) => fragen.indexOf(r) !== i)).toEqual([]);
  });
  it("die gesuchten Fragen sind abgedeckt (Kardinalität, Fremdschlüssel, Zwischentabelle, referentielle Integrität)", () => {
    ["m87", "m88", "m94", "m213", "m214", "k:db7", "k:db8", "k:db9", "k:db10", "k:db17", "k:sql19"].forEach((id) => expect(bezFor(id).length, id).toBe(1));
    expect(bezFor("G03:Kardinalitäten lesen").map((b) => artVon(b.vorher!)).sort()).toEqual(["1:1", "1:n", "m:n"]);
  });
  it("alle Beispiele sind plausibel (Schlüssel, Fremdschlüssel, Bild passt zur Lösung, Beispieldaten)", () => {
    expect(Object.fromEntries(BEZ.map((b) => [b.titel, pruefeBez(b)]))).toEqual(Object.fromEntries(BEZ.map((b) => [b.titel, []])));
  });
  it("das Bild vor der Antwort zeigt nur Entitäten, die in der Frage vorkommen", () => {
    BEZ.filter((b) => b.vorher).forEach((b) => b.refs.filter((r) => TAP2.questions.some((q) => q.id === r)).forEach((ref) => {
      const q = ohneUmlaut(refTexte(ref)!.q);
      [b.vorher!.a.t, b.vorher!.b.t].forEach((n) => expect(q, `${ref}: ${n}`).toContain(ohneUmlaut(n)));
    }));
  });
  it("„Tabelle.Spalte“ aus Erklärungen und Musterlösungen steht so im Relationenmodell", () => {
    let n = 0;
    BEZ.forEach((b) => b.refs.forEach((ref) => {
      for (const m of refTexte(ref)!.a.matchAll(/\b([A-ZÄÖÜ][A-Za-zäöüß]+)\.([A-ZÄÖÜ][A-Za-zäöüß]+)\b/g)) {
        n++;
        expect(tab(b, m[1])?.spalten.some((c) => c.n === m[2]), `${ref}: ${m[0]}`).toBe(true);
      }
    }));
    expect(n).toBeGreaterThan(0); // m88: Mitarbeiter.AbteilungsNr
  });
  it("Relationen in Musterlösungen (k:db7) stimmen mit Spalten, PK und FK überein", () => {
    const b = bezFor("k:db7")[0], rel = parseRelationen(refTexte("k:db7")!.a);
    expect(rel.map((r) => r.name).sort()).toEqual(b.tabellen.map((t) => t.name).sort());
    rel.forEach((r) => {
      expect(tab(b, r.name)!.spalten.map((c) => c.n), r.name).toEqual(r.spalten.map((c) => c.n));
      r.spalten.forEach((c) => {
        const d = tab(b, r.name)!.spalten.find((x) => x.n === c.n)!;
        if (c.pk) expect(d.pk, `${r.name}.${c.n} PK`).toBe(true);
        if (c.fk) expect(!!d.fk, `${r.name}.${c.n} FK`).toBe(true);
      });
    });
  });
  it("k:sql19: PRIMARY KEY und FOREIGN KEY … REFERENCES der Musterlösung", () => {
    const b = bezFor("k:sql19")[0], a = refTexte("k:sql19")!.a, pos = tab(b, "Position")!;
    const pk = a.match(/PRIMARY KEY \(([^)]*)\)/)![1].split(",").map((x) => x.trim());
    expect(pos.spalten.filter((c) => c.pk).map((c) => c.n)).toEqual(pk);
    const fks = [...a.matchAll(/FOREIGN KEY \((\w+)\) REFERENCES (\w+)\((\w+)\)/g)].map((m) => `${m[1]}>${m[2]}.${m[3]}`);
    expect(kanten(b.tabellen).filter((k) => k.von === "Position").map((k) => `${k.spalte}>${k.nach}.${k.ziel}`)).toEqual(fks);
  });
  it("k:db8: Fremdschlüssel steht in der Tabelle, die die Musterlösung nennt", () => {
    const m = refTexte("k:db8")!.a.match(/Fremdschlüssel (\w+) steht in (\w+)/)!;
    expect(tab(bezFor("k:db8")[0], m[2])!.spalten.find((c) => c.n === m[1])?.fk).toBe("Kunde");
  });
});

// ---------- Logik an kleinen Beispielen
const A: BezTabelle = { name: "Abteilung", spalten: [{ n: "AbtNr", pk: true }, { n: "Name" }], zeilen: [["1", "IT"]] };
const M: BezTabelle = { name: "Mitarbeiter", spalten: [{ n: "MaNr", pk: true }, { n: "Name" }, { n: "AbtNr", fk: "Abteilung" }], zeilen: [["7", "Ali", "1"]] };
const bsp = (p: Partial<BezBeispiel>): BezBeispiel => ({ titel: "T", refs: ["x"], vorher: { a: { t: "Abteilung", k: "1" }, b: { t: "Mitarbeiter", k: "n" }, notation: "zahl" }, tabellen: [A, M], abgelehnt: [], ...p });

describe("kanten", () => {
  it("FK → PK, FK-Seite n; UNIQUE oder alleiniger PK macht daraus 1", () => {
    expect(kanten([A, M])).toEqual([{ von: "Mitarbeiter", spalte: "AbtNr", nach: "Abteilung", ziel: "AbtNr", kVon: "n", kNach: "1" }]);
    const U = { ...M, spalten: M.spalten.map((c) => (c.fk ? { ...c, unique: true } : c)) };
    expect(kanten([A, U])[0].kVon).toBe("1");
  });
});

describe("pruefeBez", () => {
  it("gültiges Beispiel ohne Befund", () => expect(pruefeBez(bsp({}))).toEqual([]));
  it("Fremdschlüssel auf der 1-Seite passt nicht zum Bild 1:n", () => {
    const A2 = { ...A, spalten: [...A.spalten, { n: "MaNr", fk: "Mitarbeiter" }], zeilen: [["1", "IT", "7"]] };
    const M2 = { ...M, spalten: M.spalten.slice(0, 2), zeilen: [["7", "Ali"]] };
    expect(pruefeBez(bsp({ tabellen: [A2, M2] }))).toContain("Bild 1:n: kein Fremdschlüssel in Mitarbeiter auf Abteilung");
  });
  it("1:1 ohne UNIQUE und m:n ohne Zwischentabelle werden erkannt", () => {
    expect(pruefeBez(bsp({ vorher: { a: { t: "Abteilung", k: "1" }, b: { t: "Mitarbeiter", k: "1" }, notation: "zahl" } }))[0]).toMatch(/UNIQUE fehlt/);
    expect(pruefeBez(bsp({ vorher: { a: { t: "Abteilung", k: "m" }, b: { t: "Mitarbeiter", k: "n" }, notation: "zahl" } }))).toContain("Bild m:n: keine Zwischentabelle mit beiden Fremdschlüsseln");
  });
  it("Beispieldaten müssen die referentielle Integrität einhalten", () => {
    expect(pruefeBez(bsp({ tabellen: [A, { ...M, zeilen: [["7", "Ali", "5"]] }] }))).toContain("Mitarbeiter: AbtNr = 5 fehlt in Abteilung");
  });
  it("abgelehnte Änderungen müssen wirklich gegen einen Fremdschlüssel verstoßen", () => {
    expect(pruefeBez(bsp({ abgelehnt: [{ art: "einfuegen", tabelle: "Mitarbeiter", zeile: ["8", "Bo", "1"], grund: "x" }] }))).toContain("abgelehnt: Einfügen in Mitarbeiter verletzt keinen Fremdschlüssel");
    expect(pruefeBez(bsp({ abgelehnt: [{ art: "einfuegen", tabelle: "Mitarbeiter", zeile: ["8", "Bo", "9"], grund: "x" }] }))).toEqual([]);
    expect(pruefeBez(bsp({ abgelehnt: [{ art: "loeschen", tabelle: "Abteilung", zeile: ["1", "IT"], grund: "x" }] }))).toEqual([]);
    expect(pruefeBez(bsp({ tabellen: [{ ...A, zeilen: [["1", "IT"], ["2", "HR"]] }, M], abgelehnt: [{ art: "loeschen", tabelle: "Abteilung", zeile: ["2", "HR"], grund: "x" }] })))
      .toContain("abgelehnt: auf Abteilung 2 verweist nichts – Löschen wäre erlaubt");
  });
  it("Zieltabelle muss neben der FK-Tabelle stehen", () => {
    const K: BezTabelle = { name: "Kantine", spalten: [{ n: "KNr", pk: true }, { n: "AbtNr", fk: "Abteilung" }], zeilen: [] };
    expect(pruefeBez(bsp({ vorher: null, tabellen: [A, M, K] }))).toContain("Kantine.AbtNr: Zieltabelle Abteilung muss daneben stehen (Pfeil quer)");
  });
});

describe("relLayout", () => {
  const mn = bezFor("m87")[0];
  it("quer: Kästen nebeneinander ohne Überlappung, Pfeil von der FK-Zeile zur PK-Zeile", () => {
    const L = relLayout(mn.tabellen, "quer");
    L.boxes.slice(1).forEach((b, i) => expect(b.x).toBeGreaterThan(L.boxes[i].x + L.boxes[i].w));
    expect(L.pfeile).toHaveLength(2);
    const [links, rechts] = L.pfeile; // Belegung → Schueler (links), Belegung → Kurs (rechts)
    expect(links.k.nach).toBe("Schueler");
    expect(links.d.startsWith(`M${L.boxes[1].x},`)).toBe(true);
    expect(links.spitze.startsWith(`${L.boxes[0].x + L.boxes[0].w},`)).toBe(true);
    expect(rechts.spitze.startsWith(`${L.boxes[2].x},`)).toBe(true);
    expect([links.lVon.text, links.lNach.text]).toEqual(["n", "1"]);
    expect(L.w).toBe(L.boxes[2].x + L.boxes[2].w);
  });
  it("hoch: Kästen untereinander, schmaler als quer, Pfeile innerhalb der Fläche", () => {
    const Q = relLayout(mn.tabellen, "quer"), H = relLayout(mn.tabellen, "hoch");
    expect(H.w).toBeLessThan(Q.w);
    expect(H.w).toBeLessThan(260); // passt in die Erklärung bei 375 px
    H.boxes.slice(1).forEach((b, i) => expect(b.y).toBeGreaterThan(H.boxes[i].y + H.boxes[i].h));
    H.pfeile.forEach((p) => p.d.match(/-?\d+(\.\d+)?/g)!.map(Number).forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(Math.max(H.w, H.h)); }));
  });
  it("Kastenbreite wächst mit Spaltenname und Schlüssel-Markierungen", () => {
    const t = (c: BezTabelle["spalten"][number]): BezTabelle => ({ name: "T", spalten: [c], zeilen: [] });
    expect(boxBreite(t({ n: "AbteilungsNr", pk: true, fk: "X" }))).toBeGreaterThan(boxBreite(t({ n: "AbteilungsNr", pk: true })));
    expect(boxBreite(t({ n: "AbteilungsNr", pk: true }))).toBeGreaterThan(boxBreite(t({ n: "AbteilungsNr" })));
  });
});

describe("erLayout und endText", () => {
  const v11 = bezFor("m213")[0].vorher!, kf = bezFor("k:db17")[0].vorher!;
  it("verdeckt: ? bis zur Antwort, dann die Zahlen", () => {
    expect(erLayout(v11, "quer", false).enden.map((e) => e.lbl.text)).toEqual(["?", "?"]);
    expect(erLayout(v11, "quer", true).enden.map((e) => e.lbl.text)).toEqual(["1", "1"]);
  });
  it("Krähenfuß: vorher nur Symbole, danach die Lesart", () => {
    expect(endText(kf.a, kf, false)).toBe("");
    expect([endText(kf.a, kf, true), endText(kf.b, kf, true)]).toEqual(["genau 1", "0 bis n"]);
  });
  it("hoch ist schmaler als quer, Linie verbindet die beiden Kästen", () => {
    const Q = erLayout(v11, "quer", false), H = erLayout(v11, "hoch", false);
    expect(H.w).toBeLessThan(Q.w);
    expect(Q.linie).toEqual([Q.a.w, 20, Q.b.x, 20]);
    expect(H.linie[1]).toBe(H.a.y + H.a.h);
    expect(H.linie[3]).toBe(H.b.y);
  });
  it("quer wird die Linie bei wenig Platz bis zur Mindestlänge gekürzt", () => {
    const voll = erLayout(v11, "quer", false), knapp = erLayout(v11, "quer", false, erQuerMin(v11) + 4);
    expect(knapp.w).toBeLessThan(voll.w);
    expect(knapp.b.x - knapp.a.w).toBe(80);
    expect(erLayout(v11, "quer", false, 10).b.x - knapp.a.w).toBe(80); // nie kürzer
    // Krähenfuß: die Lesart steht unter den Entitäten, das Bild bleibt nach dem Aufdecken gleich breit
    expect(erLayout(kf, "quer", true, 320).w).toBe(erLayout(kf, "quer", false, 320).w);
    expect(erLayout(kf, "quer", true).enden.map((e) => e.lbl.y)).toEqual([56, 56]);
  });
});
