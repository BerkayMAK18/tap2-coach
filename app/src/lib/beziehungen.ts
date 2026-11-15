/**
 * Beziehungen visuell (nur neue App): Beispiele aus src/content/beziehungen.json, zugeordnet über Katalog-IDs.
 * Reine Funktionen für die Darstellung (components/BezVisual.tsx) und die Prüfung der Daten (beziehungen.test.ts):
 * - bezFor:     Beispiele zu einer Frage, Karte oder einem Lernpaket-Abschnitt
 * - kanten:     Fremdschlüssel einer Lösung als Kanten FK → PK mit Kardinalitäten (n-Seite = Tabelle mit dem FK)
 * - erLayout:   neutrales Beziehungsbild (zwei Entitäten, Linie, Kardinalitäten bzw. Krähenfuß) quer oder hoch
 * - relLayout:  Relationenmodell als Kästen mit Spalten und Pfeilen FK → PK, quer (nebeneinander) oder hoch (untereinander)
 * - pruefeBez:  Plausibilität eines Beispiels (Schlüssel, Fremdschlüssel, Kardinalitäten passen zum Bild, Beispieldaten)
 * Die Geometrie rechnet mit der Monoschrift der App (Zeichenbreite 0,6 em), damit sie ohne Messen im DOM auskommt.
 */
import raw from "@/content/beziehungen.json";
import { BezDatei, type BezBeispiel, type BezEnde, type BezSpalte, type BezTabelle, type BezVorher } from "@/content/schema";

const parsed = BezDatei.safeParse(raw);
// Fehlerhafte Daten nie zum Absturz führen lassen: dann gibt es eben keine Darstellung (der Test meldet es)
export const BEZ: BezBeispiel[] = parsed.success ? parsed.data.beispiele : [];
const BY_REF = new Map<string, BezBeispiel[]>();
BEZ.forEach((b) => b.refs.forEach((r) => BY_REF.set(r, [...(BY_REF.get(r) ?? []), b])));

/** Beispiele zu einer Katalog-ID („m88“, „k:db8“, „P04:m:n-Beziehungen auflösen“), sonst leer */
export const bezFor = (ref?: string | null): BezBeispiel[] => (ref ? BY_REF.get(ref) ?? [] : []);

export type Modus = "quer" | "hoch";

// ---------- Kanten aus Fremdschlüsseln
export type Kante = { von: string; spalte: string; nach: string; ziel: string; kVon: "1" | "n"; kNach: "1" };
const pkOf = (t: BezTabelle) => t.spalten.filter((c) => c.pk).map((c) => c.n);
/** FK → PK; die FK-Seite ist „1“, wenn der FK eindeutig ist (UNIQUE oder alleiniger Primärschlüssel), sonst „n“ */
export function kanten(tabellen: BezTabelle[]): Kante[] {
  return tabellen.flatMap((t) => t.spalten.filter((c) => c.fk).map((c): Kante => {
    const z = tabellen.find((x) => x.name === c.fk), zpk = z ? pkOf(z) : [];
    const ziel = zpk.includes(c.n) ? c.n : zpk[0] ?? c.n, pk = pkOf(t);
    return { von: t.name, spalte: c.n, nach: c.fk!, ziel, kVon: c.unique || (pk.length === 1 && pk[0] === c.n) ? "1" : "n", kNach: "1" };
  }));
}
/** „1:n“, „1:1“ oder „m:n“ eines neutralen Bilds */
export const artVon = (v: BezVorher) => (v.a.k === "1" && v.b.k === "1" ? "1:1" : v.a.k === "1" || v.b.k === "1" ? "1:n" : "m:n");

// ---------- Maße
export const CH = 7.2; // Zeichenbreite JetBrains Mono bei 12 px
const CH_H = 7.8; // fette Kopfzeile bei 13 px
export const ROW = 22, HEAD = 28;
const PADX = 10, PADB = 6, BADGE = 20, BGAP = 3;
const GAP_Q = 72, GAP_H = 30, LANE = 16;

export const badges = (c: BezSpalte) => [c.pk && "PK", c.fk && "FK", c.unique && "UQ"].filter((x): x is string => !!x);
const zeilenBreite = (c: BezSpalte) => { const n = badges(c).length; return c.n.length * CH + (n ? 8 + n * (BADGE + BGAP) - BGAP : 0); };
export const boxBreite = (t: BezTabelle) => Math.ceil(Math.max(t.name.length * CH_H + 2 * PADX, ...t.spalten.map((c) => zeilenBreite(c) + 2 * PADX)));
export const boxHoehe = (t: BezTabelle) => HEAD + t.spalten.length * ROW + PADB;

// ---------- Relationenmodell
export type Box = { t: BezTabelle; x: number; y: number; w: number; h: number };
export type Pfeil = { k: Kante; d: string; spitze: string; lVon: Lbl; lNach: Lbl };
export type Lbl = { x: number; y: number; text: string; anchor: "start" | "middle" | "end" };
export type RelLayout = { w: number; h: number; boxes: Box[]; pfeile: Pfeil[] };

/** Mitte der Zeile einer Spalte (y) in einem Kasten */
const zeileY = (b: Box, n: string) => b.y + HEAD + Math.max(0, b.t.spalten.findIndex((c) => c.n === n)) * ROW + ROW / 2;
/** Pfeilspitze bei (x, y), zeigt nach links (dir = -1) oder rechts (dir = 1) */
const spitze = (x: number, y: number, dir: 1 | -1) => `${x},${y} ${x - dir * 8},${y - 4.5} ${x - dir * 8},${y + 4.5}`;

export function relLayout(tabellen: BezTabelle[], modus: Modus): RelLayout {
  const ks = kanten(tabellen);
  if (modus === "quer") {
    let x = 0;
    const boxes = tabellen.map((t): Box => { const b = { t, x, y: 0, w: boxBreite(t), h: boxHoehe(t) }; x += b.w + GAP_Q; return b; });
    const pfeile = ks.map((k): Pfeil => {
      const a = boxes.find((b) => b.t.name === k.von)!, z = boxes.find((b) => b.t.name === k.nach)!;
      const dir: 1 | -1 = z.x < a.x ? -1 : 1; // Richtung vom FK zum PK
      const sx = dir < 0 ? a.x : a.x + a.w, ex = dir < 0 ? z.x + z.w : z.x, sy = zeileY(a, k.spalte), ey = zeileY(z, k.ziel);
      const mx = Math.round((sx + ex) / 2);
      return {
        k, d: `M${sx},${sy} H${mx} V${ey} H${ex - dir * 8}`, spitze: spitze(ex, ey, dir),
        lVon: { x: sx + dir * 5, y: sy - 6, text: k.kVon, anchor: dir < 0 ? "end" : "start" },
        lNach: { x: ex - dir * 11, y: ey - 6, text: k.kNach, anchor: dir < 0 ? "start" : "end" },
      };
    });
    return { w: Math.max(0, x - GAP_Q), h: Math.max(...boxes.map((b) => b.h)) + 2, boxes, pfeile };
  }
  let y = 0;
  const boxes = tabellen.map((t): Box => { const b = { t, x: 0, y, w: boxBreite(t), h: boxHoehe(t) }; y += b.h + GAP_H; return b; });
  const maxW = Math.max(...boxes.map((b) => b.w));
  const pfeile = ks.map((k, i): Pfeil => {
    const a = boxes.find((b) => b.t.name === k.von)!, z = boxes.find((b) => b.t.name === k.nach)!;
    const sx = a.x + a.w, ex = z.x + z.w, sy = zeileY(a, k.spalte), ey = zeileY(z, k.ziel), lx = maxW + 22 + i * LANE;
    return {
      k, d: `M${sx},${sy} H${lx} V${ey} H${ex + 8}`, spitze: spitze(ex, ey, -1),
      lVon: { x: sx + 5, y: sy - 6, text: k.kVon, anchor: "start" },
      lNach: { x: ex + 11, y: ey - 6, text: k.kNach, anchor: "start" },
    };
  });
  return { w: maxW + 22 + Math.max(0, ks.length - 1) * LANE + 4, h: y - GAP_H + 2, boxes, pfeile };
}

// ---------- Neutrales Beziehungsbild
export type ErBox = { name: string; x: number; y: number; w: number; h: number };
/** Ende der Linie an einer Entität: Punkt auf dem Rand, Winkel der Linie (0 = nach rechts), Beschriftung */
export type ErEnde = { e: BezEnde; x: number; y: number; winkel: number; lbl: Lbl };
export type ErLayout = { w: number; h: number; a: ErBox; b: ErBox; linie: [number, number, number, number]; enden: [ErEnde, ErEnde] };
const ER_H = 40, ER_LINE_Q = 150, ER_LINE_MIN = 80, ER_LINE_H = 70;
const erBreite = (n: string) => Math.ceil(n.length * CH_H + 28);

/** Text an einem Ende: Zahl („1“, „n“, „m“) oder „?“ (verdeckt); beim Krähenfuß nach dem Aufdecken die Lesart */
export function endText(e: BezEnde, v: BezVorher, offen: boolean): string {
  if (v.notation === "kraehenfuss") return offen ? `${e.min ?? 1} bis ${e.k === "1" ? "1" : "n"}`.replace("1 bis 1", "genau 1").replace("0 bis 1", "0 oder 1") : "";
  return v.verdeckt && !offen ? "?" : e.k;
}

/** Breite quer bei kürzester Linie – passt sie nicht, steht das Bild hoch */
export const erQuerMin = (v: BezVorher) => erBreite(v.a.t) + erBreite(v.b.t) + ER_LINE_MIN;

/** breite = verfügbarer Platz: quer wird die Linie bis auf die Mindestlänge gekürzt, bevor das Bild hoch steht */
export function erLayout(v: BezVorher, modus: Modus, offen: boolean, breite?: number | null): ErLayout {
  const aw = erBreite(v.a.t), bw = erBreite(v.b.t), kf = v.notation === "kraehenfuss";
  if (modus === "quer") {
    const linie = Math.max(ER_LINE_MIN, Math.min(ER_LINE_Q, (breite ?? Infinity) - 4 - aw - bw));
    const cy = ER_H / 2, bx = aw + linie;
    const a = { name: v.a.t, x: 0, y: 0, w: aw, h: ER_H }, b = { name: v.b.t, x: bx, y: 0, w: bw, h: ER_H };
    // Zahlen über der Linie; die Krähenfuß-Lesart unter der jeweiligen Entität, damit die Symbole frei bleiben
    const ly = cy - 8, ky = ER_H + 16;
    return {
      w: bx + bw, h: ER_H + (kf && offen ? 20 : 0), a, b, linie: [aw, cy, bx, cy],
      enden: [
        { e: v.a, x: aw, y: cy, winkel: 0, lbl: kf ? { x: aw / 2, y: ky, text: endText(v.a, v, offen), anchor: "middle" } : { x: aw + 8, y: ly, text: endText(v.a, v, offen), anchor: "start" } },
        { e: v.b, x: bx, y: cy, winkel: 180, lbl: kf ? { x: bx + bw / 2, y: ky, text: endText(v.b, v, offen), anchor: "middle" } : { x: bx - 8, y: ly, text: endText(v.b, v, offen), anchor: "end" } },
      ],
    };
  }
  const w = Math.max(aw, bw), cx = Math.round(w / 2), by = ER_H + ER_LINE_H;
  const a = { name: v.a.t, x: Math.round((w - aw) / 2), y: 0, w: aw, h: ER_H }, b = { name: v.b.t, x: Math.round((w - bw) / 2), y: by, w: bw, h: ER_H };
  const lx = cx + (kf ? 16 : 9);
  return {
    w: Math.max(w, lx + 70), h: by + ER_H, a, b, linie: [cx, ER_H, cx, by],
    enden: [
      { e: v.a, x: cx, y: ER_H, winkel: 90, lbl: { x: lx, y: ER_H + 16, text: endText(v.a, v, offen), anchor: "start" } },
      { e: v.b, x: cx, y: by, winkel: -90, lbl: { x: lx, y: by - 7, text: endText(v.b, v, offen), anchor: "start" } },
    ],
  };
}

// ---------- Plausibilität
const dup = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
/** Liste der Probleme eines Beispiels (leer = in Ordnung) */
export function pruefeBez(b: BezBeispiel): string[] {
  const p: string[] = [], T = b.tabellen, namen = T.map((t) => t.name);
  dup(namen).forEach((n) => p.push(`Tabelle ${n} doppelt`));
  T.forEach((t, ti) => {
    const pk = pkOf(t);
    dup(t.spalten.map((c) => c.n)).forEach((n) => p.push(`${t.name}: Spalte ${n} doppelt`));
    if (!pk.length) p.push(`${t.name}: kein Primärschlüssel`);
    t.zeilen.forEach((z, k) => { if (z.length !== t.spalten.length) p.push(`${t.name}: Zeile ${k + 1} hat ${z.length} statt ${t.spalten.length} Werte`); });
    dup(t.zeilen.map((z) => pk.map((c) => z[t.spalten.findIndex((x) => x.n === c)]).join("|"))).forEach((k) => p.push(`${t.name}: Schlüssel ${k} doppelt`));
    t.spalten.filter((c) => c.fk).forEach((c) => {
      const zi = namen.indexOf(c.fk!);
      if (zi < 0) { p.push(`${t.name}.${c.n}: Zieltabelle ${c.fk} fehlt`); return; }
      if (zi === ti) { p.push(`${t.name}.${c.n}: Verweis auf sich selbst wird nicht dargestellt`); return; }
      if (Math.abs(zi - ti) !== 1) p.push(`${t.name}.${c.n}: Zieltabelle ${c.fk} muss daneben stehen (Pfeil quer)`);
      if (!pkOf(T[zi]).includes(c.n) || pkOf(T[zi]).length !== 1) p.push(`${t.name}.${c.n}: passt nicht zum Primärschlüssel von ${c.fk}`);
      // Referentielle Integrität der Beispieldaten
      const z = T[zi], ziel = new Set(z.zeilen.map((r) => r[z.spalten.findIndex((x) => x.n === c.n)])), ci = t.spalten.indexOf(c);
      if (z.zeilen.length) t.zeilen.forEach((r) => { if (!ziel.has(r[ci])) p.push(`${t.name}: ${c.n} = ${r[ci]} fehlt in ${z.name}`); });
    });
  });
  // Jede Tabelle hängt an mindestens einem Fremdschlüssel (sonst gäbe es keine Beziehung zu zeigen)
  const ks = kanten(T);
  T.forEach((t) => { if (!ks.some((k) => k.von === t.name || k.nach === t.name)) p.push(`${t.name}: ohne Beziehung`); });
  if (b.vorher) {
    const v = b.vorher, art = artVon(v), a = v.a.t, z = v.b.t;
    [a, z].forEach((n) => { if (!namen.includes(n)) p.push(`Bild: Entität ${n} fehlt in den Tabellen`); });
    if (v.verdeckt && v.notation === "kraehenfuss") p.push("Bild: Krähenfuß zeigt die Kardinalität, verdeckt passt nicht");
    const kante = (von: string, nach: string) => ks.find((k) => k.von === von && k.nach === nach);
    if (art === "m:n") {
      if (!T.some((t) => kante(t.name, a) && kante(t.name, z))) p.push("Bild m:n: keine Zwischentabelle mit beiden Fremdschlüsseln");
    } else {
      const eins = v.a.k === "1" && v.b.k !== "1" ? a : z, viele = eins === a ? z : a;
      const k = kante(viele, eins) ?? (art === "1:1" ? kante(eins, viele) : undefined);
      if (!k) p.push(`Bild ${art}: kein Fremdschlüssel in ${viele} auf ${eins}`);
      else if ((art === "1:1") !== (k.kVon === "1")) p.push(`Bild ${art}: Fremdschlüssel ${k.von}.${k.spalte} passt nicht (${art === "1:1" ? "UNIQUE fehlt" : "darf nicht eindeutig sein"})`);
    }
    if (v.notation === "kraehenfuss" && (v.a.min === undefined || v.b.min === undefined)) p.push("Bild Krähenfuß: Mindestzahl (min) an beiden Enden nötig");
  }
  b.abgelehnt.forEach((x) => {
    const t = T.find((y) => y.name === x.tabelle);
    if (!t) { p.push(`abgelehnt: Tabelle ${x.tabelle} fehlt`); return; }
    if (x.zeile.length !== t.spalten.length) { p.push(`abgelehnt: ${x.zeile.length} statt ${t.spalten.length} Werte`); return; }
    const da = t.zeilen.some((r) => r.join("|") === x.zeile.join("|"));
    if (x.art === "einfuegen") {
      if (da) p.push(`abgelehnt: Zeile ${x.zeile.join(", ")} steht schon in ${t.name}`);
      // Das Einfügen muss wirklich gegen einen Fremdschlüssel verstoßen
      const verstoss = t.spalten.some((c, i) => { const z = c.fk && T.find((y) => y.name === c.fk); return !!z && !z.zeilen.some((r) => r[z.spalten.findIndex((s) => s.n === c.n)] === x.zeile[i]); });
      if (!verstoss) p.push(`abgelehnt: Einfügen in ${t.name} verletzt keinen Fremdschlüssel`);
    } else {
      if (!da) p.push(`abgelehnt: Zeile ${x.zeile.join(", ")} fehlt in ${t.name}`);
      // Das Löschen muss wirklich von einem Fremdschlüssel verhindert werden
      const pk = t.spalten.findIndex((c) => c.pk), wert = x.zeile[pk];
      const verweis = ks.some((k) => k.nach === t.name && T.find((y) => y.name === k.von)!.zeilen.some((r) => r[T.find((y) => y.name === k.von)!.spalten.findIndex((s) => s.n === k.spalte)] === wert));
      if (!verweis) p.push(`abgelehnt: auf ${t.name} ${wert} verweist nichts – Löschen wäre erlaubt`);
    }
  });
  return p;
}
