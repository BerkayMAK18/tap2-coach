/**
 * Prüfung – Regeln wie in der Live-App (pickMC, buildAufgabe, startRun, submitRun, finishRun, runsFor/n1ok, opHint,
 * Bewertung der Real-Klausur). Reine Funktionen; der Speicher dazu liegt in store/pruefung.ts.
 *
 * Laufende Prüfung: gleiches Format wie UI.run der Live-App (Schlüssel tap2coach-run), damit ein Neuladen
 * (und später der Umstieg) sie nicht verliert. Ergebnisse landen in S.runs (Format unverändert).
 */
import { BASE_Q, TAP2 } from "@/content/catalog";
import type { McQuestion } from "@/content/schema";
import { logCause, type ErrEv, isCause } from "./aufgaben";
import { shuffle, today } from "./dates";
import { dec } from "./lernen";
import { answer as srsAnswer, st } from "./srs";
import { isObj, note, type Run, type State } from "./state";

export type Teil = "t1" | "t2" | "wiso" | "mix";
export type Mode = "sim" | "real";
export const TEIL: Record<string, { k: string; n: string; min: number }> = {
  t1: { k: "Planen", n: "Planen eines Softwareprodukts", min: 90 },
  t2: { k: "Algorithmen", n: "Entwicklung und Umsetzung von Algorithmen", min: 90 },
  wiso: { k: "SoWi", n: "Wirtschafts- und Sozialkunde", min: 60 },
  mix: { k: "Gemischt", n: "Alle Bereiche", min: 0 },
};
export const SIM_MIN: Record<string, number> = { t1: 45, t2: 45, wiso: 60, mix: 45 };
export const MODE_LBL: Record<string, string> = { sim: "Simulation", real: "Real-Klausur", easy: "Quiz" };
export const LETTERS = "abcdefgh";

export type SimQ = { id: string; topic: string; q: string; opts: string[]; right: number; why?: string; pick: number | null };
export type RealItem = { id: string; p: number; q: string; a: string; schema: boolean; ans: string; got: number | null; cause?: string | null };
export type RealAuf = { cat: string; title: string; items: RealItem[] };
/** Laufende Prüfung (UI.run). total/used in ms; start = Beginn des laufenden Abschnitts; on = Uhr läuft. */
export type PkRun = {
  mode: Mode; teil: string; total: number; used: number; start: number; on: boolean; phase: "write" | "grade" | "done";
  qs?: SimQ[]; i?: number; auf?: RealAuf[]; auto?: boolean; pct?: number;
};

// ---------- Erzeugen
/** 30 Auswahlfragen: schwache Fragen bevorzugt (rot > neu > gelb > grün, mit Zufall), je Teil reihum über die Themen. */
export function pickMC(S: State, teil: string, n: number): SimQ[] {
  const pool = BASE_Q.filter((q): q is McQuestion => q.type === "mc" && (teil === "mix" || q.teil === teil));
  const w = (q: McQuestion) => { const s = st(S, q.id); return (s === 0 ? 3 : s === -1 ? 2 : s === 1 ? 1.5 : 1) + Math.random() * 2; };
  const wt = new Map(pool.map((q) => [q, w(q)])); // Gewicht einmal je Frage würfeln (sort ruft w() in der Live-App mehrfach auf – gleiche Verteilung)
  let list = pool.slice().sort((a, b) => wt.get(b)! - wt.get(a)!);
  if (teil !== "mix") {
    const tids = [...new Set(list.map((q) => q.topic))], out: McQuestion[] = [];
    let i = 0, guard = 0;
    while (out.length < Math.min(n, list.length) && guard++ < 1000) { const tt = tids[i++ % tids.length]; const nx = list.find((q) => q.topic === tt && !out.includes(q)); if (nx) out.push(nx); }
    list = out;
  }
  return shuffle(list.slice(0, n)).map((q) => { const order = shuffle(q.opts.map((_, i) => i)); return { id: q.id, topic: q.topic, q: q.q, opts: order.map((i) => q.opts[i]), right: order.indexOf(q.right), why: q.why, pick: null }; });
}
/** Eine Aufgabe der Real-Klausur: offene Fragen einer Kategorie bis rund 25 Punkte. */
export function buildAufgabe(teil: string, cat: string): RealAuf {
  const pool = shuffle(TAP2.open.filter((o) => o.teil === teil && o.cat === cat));
  const items: typeof pool = []; let rem = 25;
  for (const o of pool) { if (o.p <= rem) { items.push(o); rem -= o.p; } if (rem < 3) break; }
  return { cat, title: TAP2.cats[teil][cat], items: items.map((o) => ({ id: o.id, p: o.p, q: o.q, a: o.a, schema: !!o.schema, ans: "", got: null })) };
}
export function startRun(S: State, mode: Mode, teil: string, now = Date.now()): PkRun {
  if (mode === "sim") return { mode, teil, qs: pickMC(S, teil, 30), i: 0, total: SIM_MIN[teil] * 60000, used: 0, start: now, on: true, phase: "write" };
  return { mode: "real", teil, auf: shuffle(Object.keys(TAP2.cats[teil])).map((c) => buildAufgabe(teil, c)), total: 90 * 60000, used: 0, start: now, on: true, phase: "write" };
}
/** Gespeicherte Prüfung beim Start übernehmen: nur schreibend/bewertend, die Uhr ist danach angehalten. */
export function restoreRun(r: unknown, now = Date.now()): PkRun | null {
  if (!isObj(r) || !(r.mode === "sim" || r.mode === "real") || !(r.phase === "write" || r.phase === "grade")) return null;
  if (r.mode === "sim" ? !Array.isArray(r.qs) || !r.qs.length : !Array.isArray(r.auf)) return null; // eigene Daten, aber evtl. beschädigt
  const x = { ...r } as PkRun;
  if (x.on) { x.used += now - x.start; x.on = false; }
  return x;
}

// ---------- Uhr
export const left = (r: PkRun, now = Date.now()) => r.total - r.used - (r.on ? now - r.start : 0);
const pad = (n: number) => String(n).padStart(2, "0");
export const fmtT = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60); };
export const pause = (r: PkRun, now = Date.now()): PkRun => (r.on ? { ...r, used: r.used + now - r.start, on: false } : r);
export const resume = (r: PkRun, now = Date.now()): PkRun => ({ ...r, start: now, on: true });

// ---------- Abgeben und Ergebnis
const runRec = (r: PkRun, pct: number, extra: Partial<Run>, now: number, day: string): Run => ({ mode: r.mode, teil: r.teil, pct, note: note(pct), at: day, ts: now, ...extra });
/** Antworten in den Lernstand übernehmen (answer() der Live-App; Lernstatistik zählt mit). */
export function answerAll(S: State, list: [string, boolean][]): State {
  let x = S;
  list.forEach(([id, ok]) => { const { q, logDay } = srsAnswer(x, id, ok); x = { ...x, q: { ...x.q, [id]: q }, log: logDay ? { ...x.log, [logDay]: (x.log[logDay] || 0) + 1 } : x.log }; });
  return x;
}
/** Abgeben (submitRun). Simulation: sofort auswerten, Antworten zählen in den Lernstand, Ergebnis speichern. */
export function submitRun(S: State, r0: PkRun, auto: boolean, now = Date.now(), day = today()): { S: State; run: PkRun } {
  const r: PkRun = { ...pause(r0, now), phase: "grade", auto };
  if (r.mode !== "sim" || !r.qs) return { S, run: r };
  const S1 = answerAll(S, r.qs.filter((q) => q.pick !== null).map((q) => [q.id, q.pick === q.right]));
  const right = r.qs.filter((q) => q.pick === q.right).length, pct = Math.round((right / r.qs.length) * 100);
  return { S: { ...S1, runs: [...S1.runs, runRec(r, pct, { detail: right + "/" + r.qs.length }, now, day)] }, run: { ...r, pct, phase: "done" } };
}

// ---------- Real-Klausur bewerten
/** Stufen 0, ¼, ½, ¾, voll – auf halbe Punkte gerundet */
export const steps = (p: number) => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(p * f * 2) / 2);
export const STEP_LBL = ["0", "¼", "½", "¾", "voll"];
export function realStats(r: PkRun) {
  const auf = r.auf ?? [], all = auf.flatMap((a) => a.items);
  const total = all.reduce((a, i) => a + i.p, 0), graded = all.filter((i) => i.got !== null).length, got = all.reduce((a, i) => a + (i.got || 0), 0);
  return { all, total, graded, got, pct: Math.round((got / total) * 100) };
}
const mapItem = (r: PkRun, ai: number, ii: number, f: (it: RealItem) => RealItem): PkRun =>
  ({ ...r, auf: r.auf!.map((a, k) => (k !== ai ? a : { ...a, items: a.items.map((it, j) => (j !== ii ? it : f(it))) })) });
/** Punkte einer Teilaufgabe setzen (auf 0…p begrenzt) */
export const setGot = (r: PkRun, ai: number, ii: number, v: number) => mapItem(r, ai, ii, (it) => ({ ...it, got: Math.max(0, Math.min(it.p, v)) }));
/** Ursache wählen; derselbe Klick nimmt sie wieder weg */
export const toggleCause = (r: PkRun, ai: number, ii: number, c: string) => mapItem(r, ai, ii, (it) => ({ ...it, cause: it.cause === c ? null : c }));
export const setAns = (r: PkRun, ai: number, ii: number, ans: string) => mapItem(r, ai, ii, (it) => ({ ...it, ans }));
/** Ergebnis speichern: Ursachen ins Fehlerprotokoll (je Teilaufgabe), Ergebnis in S.runs. */
export function finishReal(S: State, r: PkRun, now = Date.now(), day = today()): { S: State; run: PkRun; evs: ErrEv[] } {
  const { total, got, pct } = realStats(r), evs: ErrEv[] = [];
  let errlog = S.errlog;
  r.auf!.forEach((a, ai) => a.items.forEach((it, ii) => {
    if (it.cause && isCause(it.cause) && it.got! < it.p) {
      const x = logCause(errlog, "real", "Real-Klausur " + TEIL[r.teil].k + " · " + (ai + 1) + LETTERS[ii] + " · " + r.start, it.p - it.got!, it.cause, day);
      errlog = x.errlog; evs.push(x.ev);
    }
  }));
  return { S: { ...S, errlog, runs: [...S.runs, runRec(r, pct, { detail: dec(got) + "/" + total + " P" }, now, day)] }, run: { ...r, phase: "done" }, evs };
}

// ---------- „Bereit für eine 1?“
/** Letzte zwei zählende Durchgänge: SoWi alle außer Quiz, Planen/Algorithmen nur Real-Klausuren */
export const runsFor = (S: State, t: string) => S.runs.filter((x) => x.teil === t && (t === "wiso" ? x.mode !== "easy" : x.mode === "real")).slice(-2);
export const n1ok = (S: State, t: string) => { const rs = runsFor(S, t); return rs.length === 2 && rs.every((x) => x.pct >= 92); };

// ---------- Bewertung wie ein Prüfer: Operator-Hinweis
const OPS: Record<string, [string, string]> = {
  nennen: ["Nennen", "Stichwort oder Begriff genügt, keine Erklärung nötig. Punkte je richtigem Aspekt."],
  geben: ["Angeben", "Kurze, eindeutige Angabe genügt. Punkte je richtigem Aspekt."],
  ordnen: ["Zuordnen", "Jede Zuordnung zählt einzeln. Eindeutig schreiben, keine Mehrfachnennung."],
  beschreiben: ["Beschreiben", "Sachverhalt in ganzen Sätzen und in sinnvoller Reihenfolge darstellen, ohne Wertung."],
  erläutern: ["Erläutern", "Beschreiben und zusätzlich mit Beispiel oder Begründung verständlich machen. Nur genannt: höchstens die Hälfte."],
  erklären: ["Erklären", "Zusammenhang verständlich machen, mit Begründung oder Beispiel. Nur genannt: höchstens die Hälfte."],
  begründen: ["Begründen", "Klare Entscheidung plus tragfähiges Argument. Ohne Begründung kaum Punkte."],
  bewerten: ["Bewerten", "Abwägen und ein eigenes, begründetes Urteil fällen."],
  beurteilen: ["Beurteilen", "Abwägen und ein eigenes, begründetes Urteil fällen."],
  wägen: ["Abwägen", "Pro und Contra nennen, dann zu einem begründeten Ergebnis kommen."],
  vergleichen: ["Vergleichen", "Beide Seiten nach gleichen Kriterien gegenüberstellen und den Unterschied benennen."],
  unterscheiden: ["Unterscheiden", "Beide Begriffe abgrenzen; der Unterschied muss ausdrücklich genannt sein."],
  berechnen: ["Berechnen", "Rechenweg mit Einheiten zählt mit. Ergebnis ohne Weg kann Punkte kosten."],
};
const OP_ERST: [string, string] = ["Erstellen", "Vollständiges Ergebnis. Punkte gibt es je Baustein (z. B. Aktion, Schlüssel, Schleife, Rückgabe); fehlende Bausteine kosten einzeln."];
export function opHint(q: string): [string, string] | null {
  const m = String(q).match(/\b(Nennen|Geben|Ordnen|Beschreiben|Erläutern|Erklären|Begründen|Bewerten|Beurteilen|Wägen|Vergleichen|Unterscheiden|Berechnen|Erstellen|Entwickeln|Implementieren|Zeichnen|Skizzieren|Schreiben|Formulieren|Ergänzen|Überführen|Bilden|Führen)\s+Sie\b/);
  if (!m) return null;
  return OPS[m[1].toLowerCase()] || OP_ERST;
}
