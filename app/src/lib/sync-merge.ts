/**
 * Zwei Lernstände zusammenführen – EXAKT wie syncMerge/evMerge/syncWhen in der Live-App (index.html).
 * Beide Apps hängen am selben Sync (tap2_sync). Weichen die Regeln ab, entscheiden die Geräte unterschiedlich und
 * überschreiben sich gegenseitig. Deshalb: Änderungen hier nur zusammen mit der Live-App und mit Test.
 *
 * - Frage: der neuere Stand gilt (syncWhen: Platzhalter-Uhrzeit 12:00:00.000 aus Übertragungs-Links zählt als
 *   Tagesbeginn, Zukunft zählt als „jetzt“), Versuche/Fehler als Maximum.
 * - Markierungen, eigene Karten, Prüfungen, Fehlerprotokoll: Vereinigung; Tagesstatistik: Maximum.
 * - Lösch-Ereignisse ev (m = Markierung an/aus, c = eigene Karte gelöscht, r = Prüfung gelöscht, e = Fehlerprotokoll)
 *   verhindern, dass Gelöschtes durch das Zusammenführen zurückkommt.
 */
import { cleanErr, normalize, type ErrEntry, type QRec, type Run, type State } from "./state";

type Ctx = Parameters<typeof normalize>[1];
export type Ev = { m: Record<string, [number, number]>; e: Record<string, [number, unknown]>; c: Record<string, number>; r: Record<string, number> };
const EVK = ["m", "e", "c", "r"] as const;

export function evMerge(a: Partial<Ev> | null | undefined, b: Partial<Ev> | null | undefined): Ev {
  const x = { m: {}, e: {}, c: {}, r: {} } as Ev;
  EVK.forEach((k) => { Object.assign(x[k], (a && a[k]) || {}); });
  (["m", "e"] as const).forEach((k) => Object.entries((b && b[k]) || {}).forEach(([id, e]) => { if (Array.isArray(e) && (!x[k][id] || e[0] > x[k][id][0])) (x[k] as Record<string, unknown>)[id] = e; }));
  (["c", "r"] as const).forEach((k) => Object.entries((b && b[k]) || {}).forEach(([id, t]) => { x[k][id] = Math.max(x[k][id] || 0, +(t as number) || 0); }));
  return x;
}

export function syncWhen(r: QRec | undefined): number {
  let t = +(r?.t ?? 0) || 0; const d = new Date(t);
  if (t && d.getHours() === 12 && !d.getMinutes() && !d.getSeconds() && !d.getMilliseconds()) t -= 12 * 3600000;
  return Math.min(t, Date.now());
}

/** Stabile Darstellung zum Vergleichen (Schlüssel sortiert) – wie canon() in der Live-App. */
export const canon = (o: unknown) => JSON.stringify(o, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));

export function mergeStates(L: unknown, R: unknown, ctx: Ctx, ev: Ev = evMerge(null, null)): State {
  const x = normalize(structuredClone(L), ctx), r = normalize(structuredClone(R), ctx);
  Object.entries(r.q).forEach(([id, b]) => {
    const a = x.q[id]; if (!b) return; if (!a) { x.q[id] = b; return; }
    const ta = syncWhen(a), tb = syncWhen(b), newer = tb > ta || (tb === ta && (b.b || 0) > (a.b || 0));
    x.q[id] = { ...(newer ? b : a), n: Math.max(a.n || 0, b.n || 0), w: Math.max(a.w || 0, b.w || 0) };
  });
  Object.assign(x.mark, r.mark);
  Object.entries(ev.m).forEach(([id, [, on]]) => { if (on) x.mark[id] = 1; else delete x.mark[id]; });
  Object.entries(r.custom).forEach(([t, l]) => { const have = new Set((x.custom[t] || []).map((c) => c.id)); x.custom[t] = (x.custom[t] || []).concat(l.filter((c) => c && !have.has(c.id))); });
  Object.keys(ev.c).forEach((id) => { Object.keys(x.custom).forEach((t) => { x.custom[t] = x.custom[t].filter((c) => c.id !== id); }); delete x.q[id]; delete x.mark[id]; });
  Object.entries(r.ueb).forEach(([k, b]) => { const a = x.ueb[k]; if (b && (!a || (b.at || "") > (a.at || "") || ((b.at || "") === (a.at || "") && (b.n || 0) > (a.n || 0)))) x.ueb[k] = b; });
  const rk = (y: Run) => (y && y.ts ? "t" + y.ts : canon(y)), runs = new Set(x.runs.map(rk));
  r.runs.forEach((y) => { if (!runs.has(rk(y))) { runs.add(rk(y)); x.runs.push(y); } });
  x.runs = x.runs.filter((y) => !(y && y.ts && ev.r[y.ts])).sort((p, q) => (p.ts || 0) - (q.ts || 0));
  const ek = (y: ErrEntry | null) => (y ? `${y.at}|${String(y.src)}|${String(y.ref)}` : ""), errs = new Set(x.errlog.map(ek));
  r.errlog.forEach((y) => { const k = ek(y); if (y && !errs.has(k)) { errs.add(k); x.errlog.push(y); } });
  Object.entries(ev.e).forEach(([k, [, y0]]) => { const y = y0 ? cleanErr(y0) : null, i = x.errlog.findIndex((z) => ek(z) === k); if (y0 && !y) return; if (y) { if (i >= 0) x.errlog[i] = y; else x.errlog.push(y); } else if (i >= 0) x.errlog.splice(i, 1); });
  Object.entries(r.log).forEach(([d, n]) => { x.log[d] = Math.max(x.log[d] || 0, +n || 0); });
  return x;
}
