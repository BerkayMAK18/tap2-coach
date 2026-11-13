import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Topic = { id: string; name: string; part: string; prio: string };
export type Item =
  | { id: string; type: "card"; topic: string; q: string; a: string; note: string }
  | { id: string; type: "mc"; topic: string; q: string; options: string[]; correct: number; note: string }
  | { id: string; type: "open"; topic: string; q: string; a: string; points: number };
export type Exercise = { id: string; part: string; theme: string; title: string; points: number; minutes: number; text: string; solution: string };
export type Content = { examDay: string; sqlSchema: string; topics: Topic[]; items: Item[]; exercises: Exercise[] };
export type ProgressRow = { item_id: string; topic: string; box: number; due: string; correct: number; wrong: number };
export type Rating = "sure" | "unsure" | "wrong";

let cache: Promise<Content> | null = null;
export const contentQuery = () =>
  queryOptions({
    queryKey: ["tap2-content"],
    staleTime: Infinity,
    queryFn: () => (cache ??= import("@/content/tap2.json").then((m) => m.default as unknown as Content)),
  });

export const progressQuery = () =>
  queryOptions({
    queryKey: ["progress"],
    queryFn: async () => {
      const { data, error } = await supabase.from("item_progress").select("item_id,topic,box,due,correct,wrong");
      if (error) throw error;
      return data as ProgressRow[];
    },
  });

/** Spaced-repetition intervals in days after each sure-correct answer. */
export const INTERVALS = [1, 3, 7, 14, 30];

export function today(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function addDays(n: number, from = new Date()) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + n);
  return today(d);
}

/** Next state for an item. Sure → next box; unsure/wrong → back to box 0, due tomorrow. */
export function nextState(prev: Pick<ProgressRow, "box" | "correct" | "wrong"> | undefined, rating: Rating, now = new Date()) {
  const box = prev?.box ?? 0;
  const correct = prev?.correct ?? 0;
  const wrong = prev?.wrong ?? 0;
  if (rating === "sure") {
    const nb = Math.min(box + 1, INTERVALS.length);
    return { box: nb, due: addDays(INTERVALS[nb - 1], now), correct: correct + 1, wrong };
  }
  return { box: 0, due: addDays(1, now), correct, wrong: rating === "wrong" ? wrong + 1 : wrong };
}

export async function saveRating(item: Item, prev: ProgressRow | undefined, rating: Rating) {
  const s = nextState(prev, rating);
  const { error } = await supabase
    .from("item_progress")
    .upsert({ item_id: item.id, topic: item.topic, ...s, updated_at: new Date().toISOString() }, { onConflict: "user_id,item_id" });
  if (error) throw error;
}

/** A round: due reviews first, then new items, max 20. */
export function buildRound(items: Item[], progress: ProgressRow[], max = 20, now = new Date()) {
  const map = new Map(progress.map((p) => [p.item_id, p]));
  const t = today(now);
  const due = items.filter((i) => map.has(i.id) && map.get(i.id)!.due <= t);
  const fresh = items.filter((i) => !map.has(i.id));
  return [...due, ...fresh].slice(0, max);
}

/** Mastered = reached box 3 (7-day interval) or higher. */
export function topicStats(items: Item[], progress: ProgressRow[], now = new Date()) {
  const map = new Map(progress.map((p) => [p.item_id, p]));
  const t = today(now);
  let mastered = 0, seen = 0, due = 0;
  for (const i of items) {
    const p = map.get(i.id);
    if (!p) continue;
    seen++;
    if (p.box >= 3) mastered++;
    if (p.due <= t) due++;
  }
  return { total: items.length, seen, mastered, due, pct: items.length ? Math.round((mastered / items.length) * 100) : 0 };
}

export function daysUntil(day: string, now = new Date()) {
  return Math.ceil((new Date(day + "T00:00:00Z").getTime() - new Date(today(now) + "T00:00:00Z").getTime()) / 86400000);
}
