/**
 * Suche über alle Fragen (Abschnitt „Suche über alle Fragen“ der Live-App): Fragen, Antworten, Themen, Übungsaufgaben.
 * Groß/klein, Akzente und ß egal; mehrere Wörter müssen alle vorkommen; Treffer in der Aufgabe zählen am meisten.
 * Statt HTML liefern hl()/snippet() Textstücke mit Markierung – React escaped sie (keine Fremd-HTML-Einfügung).
 */
import type { Aufgabe, Paket, Question, Topic } from "@/content/schema";
import { qParts, qTask } from "./lernen";

const norm1 = (c: string) => c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
export const norm = (x: unknown) => norm1(String(x || ""));
/** normalisierter Text + Zuordnung zur Originalposition */
function normMap(text: string): [string, number[]] {
  let n = ""; const map: number[] = [];
  for (let i = 0; i < text.length; i++) { const m = norm1(text[i]); for (const ch of m) { n += ch; map.push(i); } }
  return [n, map];
}
/** Textstück: [Text, markiert?] */
export type Seg = [string, boolean];
export function hl(text: unknown, terms: string[]): Seg[] {
  const t = String(text || ""); if (!terms.length) return [[t, false]];
  const [n, map] = normMap(t), marks = new Array<boolean>(t.length).fill(false);
  terms.forEach((x) => { let at = n.indexOf(x); while (at >= 0) { for (let k = at; k < at + x.length; k++) marks[map[k]] = true; at = n.indexOf(x, at + x.length); } });
  const out: Seg[] = [];
  for (let i = 0; i < t.length; i++) { const last = out[out.length - 1]; if (last && last[1] === marks[i]) last[0] += t[i]; else out.push([t[i], marks[i]]); }
  return out;
}
export function snippet(text: unknown, terms: string[], w: number): Seg[] {
  const t = String(text || "").replace(/\s+/g, " ");
  const [n, map] = normMap(t);
  let at = -1; terms.some((x) => (at = n.indexOf(x)) >= 0);
  if (at < 0) return [];
  const o = map[at], a = Math.max(0, o - w), b = Math.min(t.length, o + w * 2);
  return [...(a > 0 ? [["… ", false] as Seg] : []), ...hl(t.slice(a, b), terms), ...(b < t.length ? [[" …", false] as Seg] : [])];
}

export type QHit = { q: Question; task: string; front: string; back: string };
export type UHit = { u: Aufgabe; front: string; back: string };
export type THit = { t: Topic; front: string; back: string };
export type Index = { qs: QHit[]; us: UHit[]; ts: THit[] };
export function buildIndex(qs: Question[], ueb: Aufgabe[], topics: Topic[], pakete: Paket[]): Index {
  const PK = Object.fromEntries(pakete.map((p) => [p.id, p]));
  return {
    qs: qs.map((q) => ({ q, task: norm(qTask(q.q)), front: norm(q.q), back: norm(q.type === "mc" ? [undefined, undefined, q.opts.join(" "), q.why].join(" ") : [q.a, q.note, "", undefined].join(" ")) })),
    us: ueb.map((u) => ({ u, front: norm(u.titel + " " + u.thema), back: norm(u.text + " " + u.loesung) })),
    ts: topics.map((t) => ({ t, front: norm(t.n), back: norm(t.th.map((id) => (PK[id] ? PK[id].titel + " " + PK[id].kern.map((k) => k[0]).join(" ") : "")).join(" ")) })),
  };
}
export const terms = (raw: string) => norm(raw).split(/\s+/).filter((t) => t.length > 0);
/** Zu kurz (unter zwei Zeichen ohne Leerzeichen) → keine Suche. */
export const tooShort = (raw: string) => !terms(raw).length || norm(raw).replace(/\s/g, "").length < 2;

export function search(idx: Index, raw: string) {
  const tt = terms(raw);
  const all = (x: { front: string; back: string }) => tt.every((t) => (x.front + " " + x.back).includes(t));
  const score = (x: { front: string; task?: string }) => tt.filter((t) => (x.task || x.front).includes(t)).length * 2 + tt.filter((t) => x.front.includes(t)).length;
  const byScore = (a: { front: string; task?: string }, b: { front: string; task?: string }) => score(b) - score(a);
  return { terms: tt, T: idx.ts.filter(all).sort(byScore), Q: idx.qs.filter(all).sort(byScore), U: idx.us.filter(all).sort(byScore) };
}

/** Ausschnitt unter einem Fragetreffer: Situation, Antworten oder Antwort – nur wenn die Aufgabe selbst nicht passt. */
export function qSnippet(x: QHit, tt: string[]): { label: string; segs: Seg[] } | null {
  const q = x.q, inTask = tt.some((t) => x.task.includes(t)), inFront = tt.some((t) => x.front.includes(t));
  if (inTask) return null;
  const segs = inFront ? snippet(qParts(q.q)[0], tt, 50) : snippet(q.type === "mc" ? q.opts.join(" · ") + " " + (q.why || "") : q.a + " " + (q.note || ""), tt, 50);
  return segs.length ? { label: inFront ? "Situation" : q.type === "mc" ? "Antworten" : "Antwort", segs } : null;
}
