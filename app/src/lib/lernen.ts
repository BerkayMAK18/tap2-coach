/**
 * Lernen: Regeln der Live-App (index.html, Abschnitte „Lernrunde“, „Übersicht“, „Lernen: Themen“) als reine Funktionen.
 * Welche Fragen eine Runde bekommt, wie sie heißt und was „Nächste Runde“ startet – 1:1 wie learnList(), learnSel(),
 * onlyList(), nextTopic() & Co. in der Live-App. Getestet in lernen.test.ts.
 */
import { allQ, inTeil, topicMapFor, topicQ, topicsFor, type LearningArea } from "@/content/catalog";
import type { Question, Topic } from "@/content/schema";
import { shuffle } from "./dates";
import { ROUND, counts, dueList, isDue, mixIn, openOrder, st } from "./srs";
import type { State } from "./state";

export const ST_LBL: Record<number, string> = { [-1]: "Neu", 0: "Rot · zuletzt falsch", 1: "Gelb · einmal richtig", 2: "Grün · sitzt" };
export const ST_SHORT: Record<number, string> = { [-1]: "Neu", 0: "Rot", 1: "Gelb", 2: "Grün" };

/** Frage = optionale Situation + Aufgabe (getrennt durch die letzte Leerzeile). */
export const qParts = (t: string): [string, string] => { t = String(t || ""); const i = t.lastIndexOf("\n\n"); return i < 0 ? ["", t] : [t.slice(0, i), t.slice(i + 2)]; };
export const qTask = (t: string) => qParts(t)[1];
/** Situationstext in Text- und Codeblöcke (```…```) zerlegen – statt HTML wie situHTML() in der Live-App. */
export function situBlocks(sit: string): { code: boolean; text: string }[] {
  const out: { code: boolean; text: string }[] = [], re = /\n?```\n?([\s\S]*?)\n?```\n?/g;
  let at = 0, m: RegExpExecArray | null;
  while ((m = re.exec(sit))) { if (m.index > at) out.push({ code: false, text: sit.slice(at, m.index) }); out.push({ code: true, text: m[1] }); at = m.index + m[0].length; }
  if (at < sit.length) out.push({ code: false, text: sit.slice(at) });
  return out;
}

/** Farbe eines Prüfungsteils (Klassen t-violet, t-blue, t-yellow, t-red). */
export const tcolOf = (t: string) => (/wiso|sowi/i.test(t) ? "yellow" : /alle|mix/i.test(t) ? "red" : t === "Teil 1" || t === "t1" ? "violet" : "blue");
export const teilRank = (t: Topic) => ({ "Teil 1": 0, "Teil 2": 1, "Teil 1 + 2": 2, SoWi: 3 } as Record<string, number>)[t.teil] ?? 4;
/** Antwort als Code darstellen (Monospace)? */
export const looksCode = (q: Question) => q.type === "card" && !!q.code && /\n|SELECT |wenn |für |CREATE |\(\)/.test(q.a);
export const dec = (x: number) => String(Math.round(x * 10) / 10).replace(".", ",");

/** Als Nächstes: zuletzt geübtes Thema, sonst Muss-Themen mit der geringsten Reife (wie nextTopic() in der Live-App). */
export function nextTopic(S: State, area: LearningArea = "fiae"): Topic {
  const topics = topicsFor(area), TP = topicMapFor(area);
  if (S.last && TP[S.last] && counts(S, topicQ(S, S.last, area)).open) return TP[S.last];
  const list = topics.map((t) => ({ t, c: counts(S, topicQ(S, t.id, area)) })).filter((x) => x.c.t && x.c.open);
  list.sort((a, b) => (a.t.prio === "Muss" ? 0 : 1) - (b.t.prio === "Muss" ? 0 : 1) || a.c.pct - b.c.pct || teilRank(a.t) - teilRank(b.t));
  return list.length ? list[0].t : topics[0];
}
/** Fragen bis zur Prüfung pro Tag (rot/neu zählt doppelt, gelb einfach) – Zielwert „Heute beantwortet … von …“. */
export function perDay(S: State, left: number, area: LearningArea = "fiae") {
  const need = allQ(S, area).reduce((a, q) => { const s = st(S, q.id); return a + (s === 2 ? 0 : s === 1 ? 1 : 2); }, 0);
  return need ? Math.ceil(need / Math.max(1, left - 1)) : 0;
}

// ---------- Runden zusammenstellen
export type SessSrc = { kind?: string; tid?: string; tids?: string[]; only?: string; part?: string; ev?: string; kap?: string; final?: boolean; area?: LearningArea };
export type Plan = { list: Question[]; title: string; src: SessSrc; startAt?: number };
export type Kind = "learn" | "part" | "due" | "err" | "new" | "mark" | "rand" | "all";
export type Only = "err" | "due" | "new";
export const ONLY_T: Record<Only, string> = { err: "Fehlerfragen", due: "Fällige Wiederholungen", new: "Neue Fragen" };
const areaSrc = (area: LearningArea) => area === "fiae" ? {} : { area };

export const learnTopic = (S: State, tid: string, area: LearningArea = "fiae"): Plan => ({ list: mixIn(S, openOrder(S, topicQ(S, tid, area)), allQ(S, area), [tid]), title: topicMapFor(area)[tid].n, src: { kind: "learn", tid, ...areaSrc(area) } });
/** learnList(kind, tid) der Live-App. tid = Thema (oder bei „part“ der Prüfungsteil t1/t2/wiso), leer = ganzer Katalog. */
export function learnList(S: State, kind: Kind, tid?: string, area: LearningArea = "fiae"): Plan | null {
  const TOPICS = topicsFor(area), TP = topicMapFor(area);
  if (kind === "learn") return tid ? learnTopic(S, tid, area) : null;
  if (kind === "part") {
    const part = tid as "t1" | "t2" | "wiso", tids = TOPICS.filter((x) => inTeil(x, part)).map((x) => x.id);
    return { list: openOrder(S, allQ(S, area).filter((q) => tids.includes(q.topic))).slice(0, ROUND), title: (part === "wiso" ? "SoWi" : part === "t1" ? "Teil 1" : "Teil 2") + " · alle Themen gemischt", src: { kind, part, ...areaSrc(area) } };
  }
  const base = tid ? topicQ(S, tid, area) : allQ(S, area), pre = tid ? TP[tid].n + ": " : "";
  if (kind === "due") return { list: dueList(S, base).slice(0, ROUND), title: pre + "Fällige Wiederholungen", src: { kind, tid, ...areaSrc(area) } };
  if (kind === "err") return { list: shuffle(base.filter((q) => st(S, q.id) === 0)), title: pre + "Fehlerfragen", src: { kind, tid, ...areaSrc(area) } };
  if (kind === "new") return { list: shuffle(base.filter((q) => st(S, q.id) === -1)).slice(0, ROUND), title: pre + "Neue Fragen", src: { kind, tid, ...areaSrc(area) } };
  if (kind === "mark") return { list: base.filter((q) => S.mark[q.id]), title: pre + "Markierte Fragen", src: { kind, tid, ...areaSrc(area) } };
  if (kind === "rand") return { list: shuffle(base.slice()).slice(0, ROUND), title: pre + "Zufällige Fragen", src: { kind, tid, ...areaSrc(area) } };
  if (kind === "all") return { list: base, title: pre + "Alle Fragen", src: { kind, tid, ...areaSrc(area) } };
  return null;
}

// Mehrfachauswahl
export const selQ = (S: State, sel: string[], area: LearningArea = "fiae") => allQ(S, area).filter((q) => sel.includes(q.topic));
export const selNames = (sel: string[], area: LearningArea = "fiae") => { const TP = topicMapFor(area); return sel.map((id) => (TP[id] ? TP[id].n.split(/[,&]/)[0].trim() : id)).join(" + "); };
/** Nur Fehler / fällige / neue Fragen – genau so viele, wie es gibt (Fehler und Fällige ohne Auffüllen). */
export const onlyList = (S: State, kind: Only, qs: Question[]) => (kind === "err" ? shuffle(qs.filter((q) => st(S, q.id) === 0)) : kind === "due" ? dueList(S, qs) : shuffle(qs.filter((q) => st(S, q.id) === -1)).slice(0, ROUND));
export const learnSel = (S: State, sel: string[], area: LearningArea = "fiae"): Plan => ({ list: mixIn(S, openOrder(S, selQ(S, sel, area)), allQ(S, area), sel), title: "Auswahl: " + selNames(sel, area), src: { kind: "sel", tids: sel.slice(), ...areaSrc(area) } });
export const learnSelOnly = (S: State, sel: string[], kind: Only, area: LearningArea = "fiae"): Plan => ({ list: onlyList(S, kind, selQ(S, sel, area)), title: "Auswahl: " + selNames(sel, area) + " · " + ONLY_T[kind], src: { kind: "sel", only: kind, tids: sel.slice(), ...areaSrc(area) } });

/** „Nächste Runde“ am Ende einer Runde (ohne Events – die startet das Event-Modul). */
export function nextRound(S: State, src: SessSrc, area: LearningArea = src.area ?? "fiae"): Plan | null {
  if (src.kind === "due" && dueList(S, src.tid ? topicQ(S, src.tid, area) : allQ(S, area)).length) return learnList(S, "due", src.tid, area);
  if (src.kind === "sel" && src.tids) return src.only && onlyList(S, src.only as Only, selQ(S, src.tids, area)).length ? learnSelOnly(S, src.tids, src.only as Only, area) : learnSel(S, src.tids, area);
  if ((src.kind === "err" || src.kind === "new") && onlyList(S, src.kind, src.tid ? topicQ(S, src.tid, area) : allQ(S, area)).length) return learnList(S, src.kind, src.tid, area);
  if (src.kind === "part") return learnList(S, "part", src.part, area);
  if (src.tid) return learnTopic(S, src.tid, area);
  return { list: openOrder(S, allQ(S, area)).slice(0, ROUND), title: "Gemischte Runde", src: { kind: "mixed", ...areaSrc(area) } };
}

/** Beim Öffnen eines Themas: ganz neues Thema → Theorie, sonst Fragen (openTopic() in der Live-App). */
export const startTab = (S: State, tid: string, area: LearningArea = "fiae") => { const c = counts(S, topicQ(S, tid, area)); return !topicMapFor(area)[tid]?.th.length || c.n !== c.t ? "fragen" : "theorie"; };
export const dueCount = (S: State, qs: Question[]) => qs.filter((q) => isDue(S, q.id)).length;

// ---------- Fehler melden (vorausgefülltes GitHub-Issue, wie reportUrl() in der Live-App)
const REPO = "BerkayMAK18/tap2-coach";
export const clip = (x: unknown, n: number) => { const s = String(x || "").trim(); return s.length > n ? s.slice(0, n) + " …" : s; };
export const quote = (x: string) => clip(x, 1200).split("\n").map((l) => "> " + l).join("\n");
export function issueUrl(title: string, lines: string[]) {
  const body = lines.concat(["", "**Was ist falsch, was schlägst du vor?**", "", "<!-- Bitte hier beschreiben. Quelle (z. B. Lösungshinweis, Gesetz) hilft beim Prüfen. -->", ""]).join("\n");
  return "https://github.com/" + REPO + "/issues/new?" + new URLSearchParams({ title, labels: "fehler", body }).toString();
}
export function reportUrl(q: Question, area: LearningArea = "fiae") {
  const TP = topicMapFor(area);
  const t = TP[q.topic];
  const L = ["**Frage-ID:** `" + q.id + "`", "**Thema:** " + (t ? t.n : q.topic), "**Art:** " + (q.type === "mc" ? "Auswahlfrage" : "Karteikarte"), "", "**Frage:**", quote(q.q)];
  if (q.type === "mc") L.push("", "**Antworten:**", ...q.opts.map((o, i) => "- " + (i === q.right ? "✅ " : "") + clip(o, 200)));
  else L.push("", "**Hinterlegte Antwort:**", quote(q.a));
  return issueUrl("Fehler in " + q.id + ": " + clip(q.q, 60), L);
}
