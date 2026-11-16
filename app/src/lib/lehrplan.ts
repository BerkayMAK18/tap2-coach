/**
 * Tutor-Lehrplan (Premium): deterministisch im Code berechnet – die KI erfindet ihn nicht.
 *
 * Grundlage: Konzept-Graph je Thema (Tutor-Belege + Lernrunden), Prüfungsdatum (EXAM_DAY), Muss-Themen und offene
 * Fehlvorstellungen. Weil alles aus dem (synchronisierten) Tutor-Stand abgeleitet wird, passt sich der Plan nach jeder
 * Sitzung von selbst an und ist auf allen Geräten gleich.
 *
 * Bedarf je Thema (0…~2,5):
 *   (1 − Beherrschung) × Gewicht (Muss 1,5 · Wichtig 1,0)
 *   + 0,2 je offener Fehlvorstellung (höchstens 0,6)
 *   + 0,15, wenn das Thema seit 3 Tagen keine Tutor-Sitzung hatte (Abstand fürs Behalten)
 *   unbekannte Beherrschung zählt als 0,2.
 * Verteilung: Tage von heute bis zum Vortag der Prüfung, je Tag SLOTS Sitzungen. Gierig das Thema mit dem höchsten Bedarf;
 * danach sinkt sein Bedarf (× 0,55) bis zum nächsten Tag – so wechseln die Themen und Schwächen kommen öfter dran.
 * Ab 3 Tagen vor der Prüfung nur noch Muss-Themen und Themen mit offener Fehlvorstellung. Letzter Tag: Wiederholung.
 * Gleichstand: feste Reihenfolge nach Themen-ID.
 */
import { addDays, daysBetween } from "./dates";
import { weakest, type ConceptGraph } from "./graph";

export type PlanTopic = { id: string; name: string; muss: boolean; g: ConceptGraph; lastSession?: number };
export type PlanItem = { kind: "sitzung"; topic: string; name: string; fokus: { id: string; label: string }[]; grund: string; bedarf: number } | { kind: "wiederholung"; topics: string[]; grund: string };
export type PlanDay = { day: string; items: PlanItem[] };
export type Lehrplan = { tage: number; days: PlanDay[]; ranking: { topic: string; name: string; bedarf: number; m: number | null; grund: string }[]; empfehlung: PlanItem | null };

export const SLOTS = 2;
const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (m: number | null) => (m == null ? "noch offen" : `${Math.round(m * 100)} %`);

export function bedarf(t: PlanTopic, now: number): { n: number; grund: string } {
  const m = t.g.m ?? 0.2, fv = Math.min(3, t.g.miscon.filter((x) => x.active).length);
  const stale = !t.lastSession || now - t.lastSession > 3 * 864e5;
  const n = (1 - m) * (t.muss ? 1.5 : 1) + 0.2 * fv + (stale ? 0.15 : 0);
  const parts = [`Stand ${pct(t.g.m)}`];
  if (t.muss) parts.push("Muss-Thema");
  if (fv) parts.push(`${fv} offene Fehlvorstellung${fv > 1 ? "en" : ""}`);
  if (stale && t.lastSession) parts.push("länger nicht geübt");
  return { n: r2(n), grund: parts.join(" · ") };
}

/** Lehrplan bis zur Prüfung. now = Zeitpunkt (ms) für „länger nicht geübt“, from = heutiger Tag. */
export function buildLehrplan(topics: PlanTopic[], from: string, exam: string, now: number): Lehrplan {
  const tage = Math.max(0, daysBetween(from, exam));
  const ranked = topics.map((t) => ({ t, ...bedarf(t, now) })).sort((a, b) => b.n - a.n || (a.t.id < b.t.id ? -1 : 1));
  const ranking = ranked.map((x) => ({ topic: x.t.id, name: x.t.name, bedarf: x.n, m: x.t.g.m, grund: x.grund }));
  if (tage <= 0 || !topics.length) return { tage, days: [], ranking, empfehlung: null };
  const days: PlanDay[] = [];
  const need = new Map(ranked.map((x) => [x.t.id, x.n]));
  const item = (t: PlanTopic, n: number, grund: string): PlanItem => ({ kind: "sitzung", topic: t.id, name: t.name, fokus: weakest(t.g, 3).map((c) => ({ id: c.id, label: c.label })), grund, bedarf: r2(n) });
  for (let i = 0; i < tage; i++) {
    const day = addDays(from, i), left = tage - i;
    if (left === 1 && tage > 1) { // Vortag der Prüfung: Wiederholung der Muss-Themen und offenen Fehlvorstellungen
      const rep = ranked.filter((x) => x.t.muss || x.t.g.miscon.some((m) => m.active)).slice(0, 4).map((x) => x.t.id);
      days.push({ day, items: [{ kind: "wiederholung", topics: rep, grund: "Letzter Tag: Fehlvorstellungen und Muss-Themen kurz wiederholen, nichts Neues mehr." }] });
      continue;
    }
    const pool = left <= 3 ? ranked.filter((x) => x.t.muss || x.t.g.miscon.some((m) => m.active)) : ranked;
    const items: PlanItem[] = [], used = new Set<string>();
    for (let s = 0; s < SLOTS; s++) {
      const best = pool.filter((x) => !used.has(x.t.id)).sort((a, b) => need.get(b.t.id)! - need.get(a.t.id)! || (a.t.id < b.t.id ? -1 : 1))[0];
      if (!best) break;
      used.add(best.t.id); items.push(item(best.t, need.get(best.t.id)!, best.grund));
      need.set(best.t.id, need.get(best.t.id)! * 0.55);
    }
    // Über Nacht erholt sich der Bedarf ein Stück (Vergessen) – höchstens bis zum Ausgangswert
    ranked.forEach((x) => need.set(x.t.id, Math.min(x.n, need.get(x.t.id)! * 1.25)));
    days.push({ day, items });
  }
  return { tage, days, ranking, empfehlung: days[0]?.items[0] ?? null };
}
