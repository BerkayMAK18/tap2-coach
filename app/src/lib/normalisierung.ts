/**
 * Normalisierung visuell (nur neue App): Beispiele aus src/content/normalisierung.json, zugeordnet über Katalog-IDs.
 * Reine Funktionen für die Darstellung (components/NormVisual.tsx) und die Prüfung der Daten (normalisierung.test.ts):
 * - normFor:      Beispiel zu einer Aufgabe, Karte, Frage oder einem Lernpaket-Abschnitt
 * - stufenDiff:   was sich von einer Stufe zur nächsten ändert (neue Tabelle, verschobene/umbenannte/neue Spalten, entfernte Spalten)
 * - abhRaster:    Pfeil-Diagramm der funktionalen Abhängigkeiten als Raster (Spalten × Abhängigkeiten)
 * - beziehungen:  Beziehungen „A 1 : n B“ aus den Fremdschlüsseln einer Stufe
 * - pruefe:       Plausibilität eines Beispiels (Schlüssel, Fremdschlüssel, kein Attribut verloren, Beispieldaten)
 * - textBloecke:  Text mit „a | b | c“-Zeilen in Text- und Tabellenblöcke zerlegen (Ausgangstabellen in Aufgabentexten)
 * - parseRelationen: „Kunde (KundenNr [PK], Name)“ aus Musterlösungen lesen (Abgleich in den Tests)
 */
import raw from "@/content/normalisierung.json";
import { NormDatei, type NormAbh, type NormBeispiel, type NormSpalte, type NormStufe, type NormTabelle } from "@/content/schema";

const parsed = NormDatei.safeParse(raw);
// Fehlerhafte Daten nie zum Absturz führen lassen: dann gibt es eben keine Darstellung (der Test meldet es)
export const NORM: NormBeispiel[] = parsed.success ? parsed.data.beispiele : [];
const BY_REF = new Map<string, NormBeispiel>();
NORM.forEach((b) => b.refs.forEach((r) => BY_REF.set(r, b)));

/** Beispiel zu einer Katalog-ID (Aufgabe „D2“, Karte „k:db1“, Frage „m85“, „P04:Normalformen“) oder null */
export const normFor = (ref?: string | null): NormBeispiel | null => (ref ? BY_REF.get(ref) ?? null : null);

/** Name einer Stufe im Stepper: „Ausgang“ bzw. „Ausgang (2. NF)“, danach „1. NF“, „2. NF“ … */
export const stufeName = (s: NormStufe, i: number) => (i > 0 ? `${s.nf}. NF` : s.nf === 0 ? "Ausgang" : `Ausgang (${s.nf}. NF)`);

// ---------- Unterschied zwischen zwei Stufen
/** bleibt: unverändert in derselben Tabelle · umbenannt: gleiche Tabelle, neuer Name/aufgeteilt · verschoben: kommt aus einer anderen Tabelle · neu: ohne Vorlage */
export type SpaltenStatus = "bleibt" | "umbenannt" | "verschoben" | "neu";
export type SpaltenInfo = NormSpalte & { status: SpaltenStatus; von?: string; alt?: string[] };
export type TabellenInfo = { t: NormTabelle; neu: boolean; spalten: SpaltenInfo[]; weg: { n: string; nach: string[] }[] };

const quellen = (c: NormSpalte) => c.aus ?? [c.n];
const hat = (t: NormTabelle, n: string) => t.spalten.some((c) => c.n === n);
/** Spalte der Folgestufe, die eine Spalte der Vorstufe übernimmt (gleicher Name oder in „aus“ genannt) */
const nimmt = (t: NormTabelle, n: string) => t.spalten.some((c) => quellen(c).includes(n));

export function stufenDiff(prev: NormStufe | undefined, cur: NormStufe): TabellenInfo[] {
  return cur.tabellen.map((t) => {
    const vorher = prev?.tabellen.find((p) => p.name === t.name);
    const spalten = t.spalten.map((c): SpaltenInfo => {
      if (!prev) return { ...c, status: "bleibt" };
      if (c.neu) return { ...c, status: "neu" };
      const q = quellen(c), umb = !q.includes(c.n);
      if (vorher && q.some((n) => hat(vorher, n))) return { ...c, status: umb ? "umbenannt" : "bleibt", ...(umb ? { alt: q } : {}) };
      const von = prev.tabellen.find((p) => q.some((n) => hat(p, n)));
      return von ? { ...c, status: "verschoben", von: von.name, ...(umb ? { alt: q } : {}) } : { ...c, status: "neu" };
    });
    const weg = vorher ? vorher.spalten.filter((c) => !nimmt(t, c.n)).map((c) => ({ n: c.n, nach: cur.tabellen.filter((x) => x !== t && nimmt(x, c.n)).map((x) => x.name) })) : [];
    return { t, neu: !!prev && !vorher, spalten, weg };
  });
}

// ---------- Abhängigkeits-Diagramm
/** Zelle im Raster: mark = Determinante (von) oder abhängige Spalte (nach); l/r = Linie durch die linke/rechte Zellhälfte */
export type AbhZelle = { mark: "von" | "nach" | null; l: boolean; r: boolean };
export function abhRaster(spalten: string[], abh: NormAbh[]): AbhZelle[][] {
  return abh.map((a) => {
    const idx = [...a.von, ...a.nach].map((n) => spalten.indexOf(n)).filter((i) => i >= 0);
    const lo = Math.min(...idx), hi = Math.max(...idx);
    return spalten.map((n, i): AbhZelle => ({ mark: a.von.includes(n) ? "von" : a.nach.includes(n) ? "nach" : null, l: i > lo && i <= hi, r: i >= lo && i < hi }));
  });
}
export const ABH_ART: Record<NormAbh["art"], [string, string]> = {
  voll: ["voll", "hängt vom ganzen Schlüssel ab – in Ordnung"],
  teilweise: ["teilweise", "hängt nur von einem Teil des Schlüssels ab – verletzt die 2. NF"],
  transitiv: ["transitiv", "hängt von einem Nichtschlüsselattribut ab – verletzt die 3. NF"],
};

// ---------- Beziehungen aus Fremdschlüsseln
export type Beziehung = { eins: string; viele: string; ueber: string; art: "1 : n" | "1 : 1" };
export function beziehungen(s: NormStufe): Beziehung[] {
  return s.tabellen.flatMap((t) => {
    const pk = t.spalten.filter((c) => c.pk).map((c) => c.n);
    return t.spalten.filter((c) => c.fk).map((c): Beziehung => ({ eins: c.fk!, viele: t.name, ueber: c.n, art: pk.length === 1 && pk[0] === c.n ? "1 : 1" : "1 : n" }));
  });
}

// ---------- Plausibilität
const dup = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
/** Liste der Probleme eines Beispiels (leer = in Ordnung) */
export function pruefe(b: NormBeispiel): string[] {
  const p: string[] = [];
  const at = b.stufen[b.abhIn];
  if (b.abh.length) {
    if (!at || at.tabellen.length !== 1) p.push(`abhIn ${b.abhIn}: Stufe mit genau einer Tabelle erwartet`);
    else b.abh.forEach((a) => [...a.von, ...a.nach].forEach((n) => { if (!hat(at.tabellen[0], n)) p.push(`Abhängigkeit: Spalte ${n} fehlt in ${at.tabellen[0].name}`); }));
  }
  b.stufen.forEach((s, i) => {
    const w = `Stufe ${i} (${s.nf}. NF)`, prev = b.stufen[i - 1];
    if (prev && s.nf <= prev.nf) p.push(`${w}: Normalform muss steigen`);
    dup(s.tabellen.map((t) => t.name)).forEach((n) => p.push(`${w}: Tabelle ${n} doppelt`));
    s.tabellen.forEach((t) => {
      const tw = `${w} ${t.name}`, pk = t.spalten.filter((c) => c.pk);
      dup(t.spalten.map((c) => c.n)).forEach((n) => p.push(`${tw}: Spalte ${n} doppelt`));
      if (!pk.length) p.push(`${tw}: kein Primärschlüssel`);
      if (s.nf >= 1) t.spalten.filter((c) => c.mehrwertig).forEach((c) => p.push(`${tw}: ${c.n} ist ab der 1. NF nicht erlaubt (mehrwertig)`));
      t.zeilen.forEach((z, k) => { if (z.length !== t.spalten.length) p.push(`${tw}: Zeile ${k + 1} hat ${z.length} statt ${t.spalten.length} Werte`); });
      // Primärschlüssel in den Beispieldaten eindeutig
      const keys = t.zeilen.map((z) => pk.map((c) => z[t.spalten.indexOf(c)]).join("|"));
      dup(keys).forEach((k) => p.push(`${tw}: Schlüssel ${k} doppelt`));
      t.spalten.filter((c) => c.fk).forEach((c) => {
        const z = s.tabellen.find((x) => x.name === c.fk);
        if (!z) { p.push(`${tw}: Fremdschlüssel ${c.n} → unbekannte Tabelle ${c.fk}`); return; }
        const zi = z.spalten.findIndex((x) => x.n === c.n && x.pk);
        if (zi < 0) { p.push(`${tw}: Fremdschlüssel ${c.n} passt zu keinem Primärschlüssel von ${z.name}`); return; }
        // Referentielle Integrität der Beispieldaten
        const ziel = new Set(z.zeilen.map((r) => r[zi])), ci = t.spalten.indexOf(c);
        if (z.zeilen.length) t.zeilen.forEach((r) => { if (r.length === t.spalten.length && !ziel.has(r[ci])) p.push(`${tw}: ${c.n} = ${r[ci]} fehlt in ${z.name}`); });
      });
    });
    if (!prev) return;
    // Kein Attribut geht verloren, keine Spalte ohne Herkunft (außer Fremdschlüssel auf einen in dieser Stufe neuen Schlüssel)
    prev.tabellen.forEach((t) => t.spalten.forEach((c) => { if (!s.tabellen.some((x) => nimmt(x, c.n))) p.push(`${w}: ${t.name}.${c.n} geht verloren`); }));
    stufenDiff(prev, s).forEach((ti) => ti.spalten.forEach((c) => { if (c.status === "neu" && !c.neu && !c.fk) p.push(`${w} ${ti.t.name}: ${c.n} ohne Herkunft (neu: true oder aus: […] angeben)`); }));
  });
  return p;
}

// ---------- Tabellen in Aufgabentexten
export type TextBlock = { text: string } | { kopf: string[]; zeilen: string[][] };
const zellen = (l: string) => l.split("|").map((x) => x.trim());
/** Zerlegt einen Text in Absätze und Tabellen: mindestens zwei aufeinanderfolgende Zeilen mit „|“ und gleicher Spaltenzahl */
export function textBloecke(text: string): TextBlock[] {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n"), out: TextBlock[] = [];
  let buf: string[] = [];
  const flush = () => { const t = buf.join("\n").replace(/^\n+|\n+$/g, ""); if (t) out.push({ text: t }); buf = []; };
  for (let i = 0; i < lines.length; ) {
    const n = lines[i].includes("|") ? zellen(lines[i]).length : 0;
    let j = i;
    while (n >= 2 && j < lines.length && lines[j].includes("|") && zellen(lines[j]).length === n) j++;
    if (j - i >= 2) { flush(); out.push({ kopf: zellen(lines[i]), zeilen: lines.slice(i + 1, j).map(zellen) }); i = j; }
    else { buf.push(lines[i]); i++; }
  }
  flush();
  return out;
}

// ---------- Relationen in Musterlösungen
export type Relation = { name: string; spalten: { n: string; pk: boolean; fk: boolean }[] };
/** Liest „Name (A [PK], B [PK, FK], C)“ bzw. „Name(A, B [FK])“ aus einem Text; Klammern mit anderem Inhalt werden übergangen */
export function parseRelationen(text: string): Relation[] {
  const out: Relation[] = [];
  for (const m of String(text ?? "").matchAll(/([A-ZÄÖÜ][A-Za-z0-9ÄÖÜäöüß_]*) ?\(([^()]*)\)/g)) {
    const teile: string[] = [];
    let tiefe = 0, cur = "";
    for (const ch of m[2]) {
      if (ch === "[") tiefe++;
      if (ch === "]") tiefe--;
      if (ch === "," && tiefe === 0) { teile.push(cur); cur = ""; } else cur += ch;
    }
    teile.push(cur);
    const spalten = teile.map((x) => x.trim().match(/^([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)(?:\s*\[([^\]]*)\])?$/));
    if (spalten.some((x) => !x)) continue;
    out.push({ name: m[1], spalten: spalten.map((x) => { const marks = (x![2] ?? "").toUpperCase().split(",").map((s) => s.trim()); return { n: x![1], pk: marks.includes("PK"), fk: marks.includes("FK") }; }) });
  }
  return out;
}
