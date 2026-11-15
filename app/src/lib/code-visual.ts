/**
 * Ablauf-Visualisierung für Pseudocode-Beispiele (Sortieren, Suchen, Maximum) – rein und deterministisch.
 *
 * Für ausgewählte Blöcke (Zuordnung über die Prüfsumme wie bei den Python-/JavaScript-Fassungen) erzeugt ein Simulator
 * die einzelnen Schritte: Feld-Zustand, was verglichen/getauscht wird, welche Teile fertig sind, die Variablen und die
 * gerade ausgeführten Zeilen des Pseudocodes. Die Zeilen werden über Muster im Pseudocode gefunden („für i“, „wenn“,
 * „tmp =“ …), damit dieselbe Logik zu verschieden geschriebenen Fassungen desselben Verfahrens passt.
 */
import { codeKey, normCode } from "./code-variants";

export type Algo = "bubble" | "selection" | "insertion" | "binary" | "linear" | "max";
export type Frame = {
  arr: number[];
  /** verglichene Indizes, getauschte Indizes, aktuelles Element (Einfügen), fertige Indizes */
  cmp?: [number, number]; swap?: [number, number]; key?: number; done?: number[];
  /** Suchbereich (binäre Suche), Mitte, gefunden, bisher Bestes (Maximum) */
  range?: [number, number]; mid?: number; found?: number; best?: number; at?: number;
  vars: Record<string, number | string>;
  lines: number[];
  text: string;
};
export type Visual = { algo: Algo; absteigend?: boolean };

/** Blöcke mit Ablauf (Prüfsumme des Pseudocodes → Verfahren) */
const VISUAL: Record<string, Visual> = {
  "15b322q": { algo: "bubble" }, "1ebfb30": { algo: "bubble" }, glm0ga: { algo: "bubble" },
  q135p7: { algo: "selection" }, "1sb26vp": { algo: "selection" }, breabz: { algo: "selection", absteigend: true },
  "10fod6e": { algo: "insertion" }, lhrm61: { algo: "insertion" },
  "13ekumi": { algo: "binary" }, "1f2ydvp": { algo: "binary" },
  "18jbbsi": { algo: "max" }, "1kg0vkq": { algo: "max" },
  "1lihgq2": { algo: "linear" },
};
export const visualFor = (pseudo: string): Visual | null => VISUAL[codeKey(pseudo)] ?? null;
export const visualKeys = () => Object.keys(VISUAL);
export const ALGO_NAME: Record<Algo, string> = { bubble: "Bubble Sort", selection: "Selection Sort", insertion: "Insertion Sort", binary: "Binäre Suche", linear: "Lineare Suche", max: "Maximum suchen" };

/** Zeilennummern zu Rollen über Muster finden (erste passende Zeile, optional ab einer Zeile) */
export function findLines(pseudo: string) {
  const L = normCode(pseudo).split("\n");
  const f = (re: RegExp, from = 0) => { for (let i = from; i < L.length; i++) if (re.test(L[i])) return i; return -1; };
  const outer = f(/^\s*für\s+\w+\s*=/i), inner = f(/^\s*für\s+j\b/i), cond = f(/^\s*wenn\b/i, Math.max(0, outer));
  const swap = f(/\btmp\s*=/i);
  const swapLines = swap < 0 ? [] : /;/.test(L[swap]) ? [swap] : [swap, swap + 1, swap + 2].filter((i) => i < L.length);
  const minInit = f(/(min|max)\w*\s*=\s*i\b/i), minSet = f(/(min|max)\w*\s*=\s*j\b/i);
  return {
    count: L.length, outer, inner, cond, swapLines, minInit, minSet,
    take: f(/^\s*\w+\s*=\s*\w+\[i\]\s*$/i), jInit: f(/^\s*j\s*=\s*i\s*-\s*1/i), loop: f(/^\s*solange\b/i),
    shift: f(/\[j\s*\+\s*1\]\s*=\s*\w+\[j\]/i), dec: f(/^\s*j\s*=\s*j\s*-\s*1/i), insert: f(/\[j\s*\+\s*1\]\s*=\s*[a-zäöü]\w*\s*$/i),
    lr: [f(/links\s*=\s*0/i), f(/rechts\s*=\s*\w+/i)].filter((i) => i >= 0), mid: f(/mitte\s*=/i), eq: f(/^\s*wenn\b.*\bmitte\]\s*=/i),
    hit: f(/rückgabe\s+(mitte|i)\b/i), lt: f(/sonst\s+wenn/i), goRight: f(/links\s*=\s*mitte/i), goLeft: f(/rechts\s*=\s*mitte/i), miss: f(/rückgabe\s+-1/i),
    maxInit: [f(/max\w*\s*=\s*(werte\[0\]|0)\s*$/i), f(/max\w*\s*=\s*0\s*$/i)].filter((i, k, a) => i >= 0 && a.indexOf(i) === k),
    maxSet: [f(/max\w*\s*=\s*\w+\[i\]/i), f(/max\w*\s*=\s*i\s*$/i)].filter((i, k, a) => i >= 0 && a.indexOf(i) === k),
  };
}
const ln = (...xs: number[]) => xs.filter((x) => x >= 0);

// ---------- Simulatoren
function bubble(a0: number[], L: ReturnType<typeof findLines>): Frame[] {
  const a = a0.slice(), n = a.length, out: Frame[] = [], done: number[] = [];
  out.push({ arr: a.slice(), vars: { n }, lines: [], text: `Ausgangslage: ${n} Werte. Bubble Sort vergleicht immer zwei Nachbarn und tauscht sie, wenn sie falsch herum stehen.` });
  for (let i = 0; i <= n - 2; i++) {
    out.push({ arr: a.slice(), done: done.slice(), vars: { i }, lines: ln(L.outer), text: `Durchlauf i = ${i}: Danach steht der größte noch unsortierte Wert ganz hinten.` });
    for (let j = 0; j <= n - 2 - i; j++) {
      const sw = a[j] > a[j + 1];
      out.push({ arr: a.slice(), cmp: [j, j + 1], done: done.slice(), vars: { i, j }, lines: ln(L.inner, L.cond), text: `Vergleiche a[${j}] = ${a[j]} mit a[${j + 1}] = ${a[j + 1]}: ${sw ? "größer → tauschen" : "passt, nicht tauschen"}.` });
      if (sw) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; out.push({ arr: a.slice(), swap: [j, j + 1], done: done.slice(), vars: { i, j }, lines: L.swapLines, text: `Getauscht über tmp: jetzt a[${j}] = ${a[j]}, a[${j + 1}] = ${a[j + 1]}.` }); }
    }
    done.push(n - 1 - i);
  }
  done.push(0);
  out.push({ arr: a.slice(), done: done.slice(), vars: {}, lines: [], text: "Fertig: Das Feld ist aufsteigend sortiert." });
  return out;
}
function selection(a0: number[], L: ReturnType<typeof findLines>, desc: boolean): Frame[] {
  const a = a0.slice(), n = a.length, out: Frame[] = [], done: number[] = [], wort = desc ? "größte" : "kleinste", sym = desc ? ">" : "<";
  out.push({ arr: a.slice(), vars: { n }, lines: [], text: `Ausgangslage: Selection Sort sucht in jedem Durchlauf das ${wort} Element im unsortierten Rest und setzt es nach vorn.` });
  for (let i = 0; i <= n - 2; i++) {
    let p = i;
    out.push({ arr: a.slice(), best: p, done: done.slice(), vars: { i, pos: p }, lines: ln(L.outer, L.minInit), text: `Durchlauf i = ${i}: Merke Position ${i} (Wert ${a[i]}) als bisher ${wort}s.` });
    for (let j = i + 1; j <= n - 1; j++) {
      const better = desc ? a[j] > a[p] : a[j] < a[p];
      out.push({ arr: a.slice(), cmp: [j, p], best: p, done: done.slice(), vars: { i, j, pos: p }, lines: ln(L.inner, L.cond), text: `Ist a[${j}] = ${a[j]} ${sym} a[${p}] = ${a[p]}? ${better ? "Ja → neue Position merken." : "Nein."}` });
      if (better) { p = j; out.push({ arr: a.slice(), best: p, done: done.slice(), vars: { i, j, pos: p }, lines: ln(L.minSet >= 0 ? L.minSet : L.cond), text: `Neues ${wort}s Element an Position ${p} (Wert ${a[p]}).` }); }
    }
    if (p !== i) [a[i], a[p]] = [a[p], a[i]];
    done.push(i);
    out.push({ arr: a.slice(), swap: [i, p], done: done.slice(), vars: { i, pos: p }, lines: L.swapLines, text: p !== i ? `Tausche a[${i}] und a[${p}]: Position ${i} ist jetzt fertig.` : `Das ${wort} Element steht schon an Position ${i} – der Tausch ändert nichts.` });
  }
  done.push(n - 1);
  out.push({ arr: a.slice(), done: done.slice(), vars: {}, lines: [], text: `Fertig: Das Feld ist ${desc ? "absteigend" : "aufsteigend"} sortiert.` });
  return out;
}
function insertion(a0: number[], L: ReturnType<typeof findLines>): Frame[] {
  const a = a0.slice(), n = a.length, out: Frame[] = [];
  const sorted = (k: number) => Array.from({ length: k + 1 }, (_, x) => x);
  out.push({ arr: a.slice(), done: [0], vars: { n }, lines: [], text: "Ausgangslage: Der erste Wert allein gilt als sortiert. Insertion Sort fügt die übrigen Werte nacheinander links an der richtigen Stelle ein." });
  for (let i = 1; i <= n - 1; i++) {
    const v = a[i]; let j = i - 1;
    out.push({ arr: a.slice(), key: i, done: sorted(i - 1), vars: { i, wert: v, j }, lines: ln(L.outer, L.take, L.jInit), text: `i = ${i}: Nimm den Wert ${v} heraus und suche links davon seinen Platz.` });
    while (j >= 0 && a[j] > v) {
      out.push({ arr: a.slice(), cmp: [j, j + 1], key: j + 1, done: sorted(i - 1), vars: { i, wert: v, j }, lines: ln(L.loop), text: `a[${j}] = ${a[j]} > ${v} → eine Stelle nach rechts schieben.` });
      a[j + 1] = a[j]; j--;
      out.push({ arr: a.slice(), key: j + 1, done: sorted(i - 1), vars: { i, wert: v, j }, lines: ln(L.shift, L.dec), text: `Verschoben; j ist jetzt ${j}.` });
    }
    out.push({ arr: a.slice(), key: j + 1, done: sorted(i - 1), vars: { i, wert: v, j }, lines: ln(L.loop), text: j < 0 ? "j < 0: Anfang erreicht, Schleife endet." : `a[${j}] = ${a[j]} ≤ ${v}: Platz gefunden, Schleife endet.` });
    a[j + 1] = v;
    out.push({ arr: a.slice(), at: j + 1, done: sorted(i), vars: { i, wert: v, j }, lines: ln(L.insert), text: `Setze ${v} an Position ${j + 1}. Die ersten ${i + 1} Werte sind jetzt sortiert.` });
  }
  out.push({ arr: a.slice(), done: sorted(n - 1), vars: {}, lines: [], text: "Fertig: Das Feld ist aufsteigend sortiert." });
  return out;
}
function binary(a: number[], x: number, L: ReturnType<typeof findLines>): Frame[] {
  const out: Frame[] = []; let lo = 0, hi = a.length - 1;
  out.push({ arr: a, range: [lo, hi], vars: { gesucht: x, links: lo, rechts: hi }, lines: L.lr, text: `Gesucht: ${x}. Das Feld ist sortiert – deshalb darf man in der Mitte nachsehen und eine Hälfte verwerfen.` });
  while (lo <= hi) {
    const m = Math.floor((lo + hi) / 2);
    out.push({ arr: a, range: [lo, hi], mid: m, vars: { gesucht: x, links: lo, rechts: hi, mitte: m }, lines: ln(L.loop, L.mid), text: `links = ${lo}, rechts = ${hi} → mitte = (${lo} + ${hi}) div 2 = ${m}, Wert ${a[m]}.` });
    if (a[m] === x) { out.push({ arr: a, range: [lo, hi], found: m, vars: { gesucht: x, mitte: m }, lines: ln(L.eq, L.hit), text: `${a[m]} = ${x}: gefunden an Position ${m}. Rückgabe ${m}.` }); return out; }
    if (a[m] < x) { lo = m + 1; out.push({ arr: a, range: [lo, hi], vars: { gesucht: x, links: lo, rechts: hi }, lines: ln(L.lt, L.goRight), text: `${a[m]} < ${x}: Gesuchtes liegt rechts – links = ${lo}.` }); }
    else { hi = m - 1; out.push({ arr: a, range: [lo, hi], vars: { gesucht: x, links: lo, rechts: hi }, lines: ln(L.goLeft), text: `${a[m]} > ${x}: Gesuchtes liegt links – rechts = ${hi}.` }); }
  }
  out.push({ arr: a, vars: { gesucht: x, links: lo, rechts: hi }, lines: ln(L.miss), text: `links > rechts: Bereich leer, ${x} kommt nicht vor. Rückgabe -1.` });
  return out;
}
function linear(a: number[], x: number, L: ReturnType<typeof findLines>): Frame[] {
  const out: Frame[] = [{ arr: a, vars: { gesucht: x }, lines: [], text: `Gesucht: ${x}. Lineare Suche prüft einen Wert nach dem anderen – das Feld muss nicht sortiert sein.` }];
  for (let i = 0; i < a.length; i++) {
    out.push({ arr: a, mid: i, vars: { gesucht: x, i }, lines: ln(L.outer, L.cond), text: `Ist a[${i}] = ${a[i]} gleich ${x}? ${a[i] === x ? "Ja." : "Nein, weiter."}` });
    if (a[i] === x) { out.push({ arr: a, found: i, vars: { gesucht: x, i }, lines: ln(L.hit), text: `Gefunden an Position ${i}. Rückgabe ${i}.` }); return out; }
  }
  out.push({ arr: a, vars: { gesucht: x }, lines: ln(L.miss), text: `Ende erreicht, ${x} kommt nicht vor. Rückgabe -1.` });
  return out;
}
function max(a: number[], L: ReturnType<typeof findLines>): Frame[] {
  const out: Frame[] = []; let p = 0;
  out.push({ arr: a, best: 0, vars: { maxPos: 0, maxWert: a[0] }, lines: L.maxInit, text: `Start: Der erste Wert ${a[0]} ist das bisherige Maximum.` });
  for (let i = 1; i < a.length; i++) {
    const better = a[i] > a[p];
    out.push({ arr: a, cmp: [i, p], best: p, vars: { i, maxPos: p, maxWert: a[p] }, lines: ln(L.outer, L.cond), text: `Ist a[${i}] = ${a[i]} > ${a[p]}? ${better ? "Ja → neues Maximum." : "Nein."}` });
    if (better) { p = i; out.push({ arr: a, best: p, vars: { i, maxPos: p, maxWert: a[p] }, lines: L.maxSet, text: `Neues Maximum ${a[p]} an Position ${p}.` }); }
  }
  out.push({ arr: a, found: p, vars: { maxPos: p, maxWert: a[p] }, lines: [], text: `Fertig: Das Maximum ist ${a[p]} an Position ${p}.` });
  return out;
}

/** Beispieldaten (fest, damit die Erklärung beim ersten Öffnen immer gleich ist) und zufällige neue Daten */
export const SAMPLE: Record<Algo, { arr: number[]; x?: number }> = {
  bubble: { arr: [5, 2, 8, 1, 9, 3] }, selection: { arr: [29, 10, 14, 37, 13] }, insertion: { arr: [7, 3, 9, 1, 6] },
  binary: { arr: [3, 8, 12, 17, 23, 31, 42, 56], x: 31 }, linear: { arr: [14, 7, 22, 3, 19], x: 3 }, max: { arr: [12, 45, 7, 63, 28, 51] },
};
export function randomData(algo: Algo, rnd: () => number = Math.random): { arr: number[]; x?: number } {
  const n = algo === "binary" ? 8 : 6, arr = Array.from({ length: n }, () => 1 + Math.floor(rnd() * 60));
  if (algo === "binary") { const s = [...new Set(arr)].sort((a, b) => a - b); while (s.length < 6) s.push(s[s.length - 1] + 1 + Math.floor(rnd() * 9)); return { arr: s, x: rnd() < 0.8 ? s[Math.floor(rnd() * s.length)] : s[s.length - 1] + 3 }; }
  if (algo === "linear") return { arr, x: rnd() < 0.8 ? arr[Math.floor(rnd() * n)] : 99 };
  return { arr };
}

/** Alle Schritte für ein Verfahren und einen Pseudocode-Block */
export function simulate(v: Visual, pseudo: string, data: { arr: number[]; x?: number }): Frame[] {
  const L = findLines(pseudo), a = data.arr;
  switch (v.algo) {
    case "bubble": return bubble(a, L);
    case "selection": return selection(a, L, !!v.absteigend);
    case "insertion": return insertion(a, L);
    case "binary": return binary(a, data.x ?? a[0], L);
    case "linear": return linear(a, data.x ?? a[0], L);
    case "max": return max(a, L);
  }
}
