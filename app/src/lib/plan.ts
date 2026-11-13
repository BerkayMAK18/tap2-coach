/**
 * Lernplan bis zur Prüfung (buildPlan() der Live-App): Alle noch nicht grünen Fragen werden auf die Lerntage verteilt –
 * Teil 1 zuerst, Pflichtthemen vor den übrigen. Sonntags Prüfung simulieren, mittwochs Operator-Trainer, der letzte Tag
 * nur Wiederholen. Rechnet sich täglich neu aus dem Lernstand. Genutzt von der Übersicht („Heute laut Lernplan“)
 * und später vom Lernplan in Tipps.
 */
import { TOPICS, topicQ } from "@/content/catalog";
import { EXAM_DAY } from "@/config";
import { addDays, today } from "./dates";
import { teilRank } from "./lernen";
import { st } from "./srs";
import type { State } from "./state";

export type PlanItem = { kind: "topic"; tid: string; n: number } | { kind: "sim"; teil: "t1" | "t2" | "wiso" } | { kind: "op" } | { kind: "final" };
export const wdOf = (d: string) => new Date(d + "T12:00:00").getDay();

export function buildPlan(S: State, from = today(), exam = EXAM_DAY) {
  const days: string[] = []; for (let d = from; d < exam && days.length < 120; d = addDays(d, 1)) days.push(d);
  const plan: Record<string, PlanItem[]> = {}; days.forEach((d) => (plan[d] = []));
  if (!days.length) return { days, plan, per: 0, total: 0 };
  const last = days[days.length - 1];
  const study = days.filter((d) => d !== last && wdOf(d) !== 0);
  const topics = TOPICS.slice().sort((a, b) => teilRank(a) - teilRank(b) || (a.prio === "Muss" ? 0 : 1) - (b.prio === "Muss" ? 0 : 1)).map((t) => ({ t, open: topicQ(S, t.id).filter((q) => st(S, q.id) !== 2).length })).filter((x) => x.open > 0);
  const total = topics.reduce((a, x) => a + x.open, 0), per = study.length ? Math.ceil(total / study.length) : total;
  let di = 0, cap = per;
  topics.forEach((x) => { let rest = x.open; while (rest > 0 && di < study.length) { const take = Math.min(rest, cap); plan[study[di]].push({ kind: "topic", tid: x.t.id, n: take }); rest -= take; cap -= take; if (cap <= 0) { di++; cap = per; } } });
  let k = 0; days.filter((d) => wdOf(d) === 0 && d !== last).forEach((d) => plan[d].push({ kind: "sim", teil: (["t1", "t2", "wiso"] as const)[k++ % 3] }));
  days.filter((d) => wdOf(d) === 3 && d !== last).forEach((d) => plan[d].push({ kind: "op" }));
  plan[last].push({ kind: "final" });
  return { days, plan, per, total };
}
