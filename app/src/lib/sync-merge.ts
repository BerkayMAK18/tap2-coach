/**
 * Zwei Lernstände zusammenführen (Sync zwischen Geräten). Regeln wie in der Live-App (syncMerge):
 * - Frage: der neuere Stand gilt (Zeitpunkt t, nie in der Zukunft), Versuche/Fehler als Maximum.
 * - Markierungen, eigene Karten, Prüfungen, Fehlerprotokoll: Vereinigung. Tagesstatistik: Maximum.
 * - Aufgabenpunkte: der neuere Eintrag.
 * Ergebnis: Es geht nie etwas verloren.
 *
 * Bekannte Grenze (Stufe 1): Löschungen (Markierung entfernen, eigene Karte/Prüfung löschen) werden noch nicht als
 * Ereignis übertragen und können beim Zusammenführen von einem anderen Gerät zurückkommen. Die Live-App nutzt dafür
 * Lösch-Ereignisse (syncEv) – wird mit Stufe 2 übernommen.
 */
import { normalize, type ErrEntry, type QRec, type Run, type State } from "./state";

type Ctx = Parameters<typeof normalize>[1];
const when = (r: QRec) => Math.min(r.t ?? 0, Date.now());

export function mergeStates(local: unknown, remote: unknown, ctx: Ctx): State {
  const x = normalize(structuredClone(local), ctx), r = normalize(structuredClone(remote), ctx);
  Object.entries(r.q).forEach(([id, b]) => {
    const a = x.q[id];
    if (!a) { x.q[id] = b; return; }
    const newer = when(b) > when(a) || (when(b) === when(a) && (b.b ?? 0) > (a.b ?? 0));
    x.q[id] = { ...(newer ? b : a), n: Math.max(a.n ?? 0, b.n ?? 0), w: Math.max(a.w ?? 0, b.w ?? 0) };
  });
  Object.assign(x.mark, r.mark);
  Object.entries(r.custom).forEach(([t, l]) => { const have = new Set((x.custom[t] ?? []).map((c) => c.id)); x.custom[t] = (x.custom[t] ?? []).concat(l.filter((c) => !have.has(c.id))); });
  Object.entries(r.ueb).forEach(([k, b]) => { const a = x.ueb[k]; if (!a || b.at > a.at || (b.at === a.at && (b.n ?? 0) > (a.n ?? 0))) x.ueb[k] = b; });
  const rk = (y: Run) => (y.ts ? "t" + y.ts : JSON.stringify(y)), runs = new Set(x.runs.map(rk));
  r.runs.forEach((y) => { if (!runs.has(rk(y))) { runs.add(rk(y)); x.runs.push(y); } });
  x.runs.sort((p, q) => (p.ts ?? 0) - (q.ts ?? 0));
  const ek = (y: ErrEntry) => `${y.at}|${String(y.src)}|${String(y.ref)}`, errs = new Set(x.errlog.map(ek));
  r.errlog.forEach((y) => { if (!errs.has(ek(y))) { errs.add(ek(y)); x.errlog.push(y); } });
  Object.entries(r.log).forEach(([d, n]) => { x.log[d] = Math.max(x.log[d] ?? 0, n); });
  return x;
}
