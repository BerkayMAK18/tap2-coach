/**
 * Auf ein anderes Gerät übertragen: Link + QR-Code, ohne Server (txEncode/txDecode/txApply der Live-App).
 * Format (gleich wie die Live-App, Links funktionieren in beiden Richtungen):
 *   Version "1" (deflate) bzw. "0" + base64url( [2 Byte JSON-Länge][JSON][je bearbeiteter Frage 3 Byte][Markierungs-Bitmap] )
 * Ein Link kann von einer fremden Person stammen: Beim Lesen wird jedes Teil auf das erwartete Format gezwungen.
 */
import { BASE_Q, NORMALIZE_CTX, TAP2 } from "@/content/catalog";
import { b64u, deflate } from "./crypto";
import { addDays, daysBetween, iso, today } from "./dates";
import { IV } from "./srs";
import { arr, blank, cleanCustom, cleanErr, cleanLog, cleanQ, cleanRun, dayStr, isObj, mapObj, normalize, num, pastDay, type CustomCard, type ErrEntry, type QRec, type Run, type State } from "./state";

/** Listenlängen des Absenders: daraus ergeben sich die IDs eindeutig (m0…, k:deck0…), auch bei neueren Katalogen */
export function txLens(): [string, number][] {
  const m = BASE_Q.filter((q) => /^m\d+$/.test(q.id)).length;
  const per: Record<string, number> = {};
  BASE_Q.forEach((q) => { const x = q.id.match(/^k:([a-z0-9]+?)(\d+)$/); if (x && TAP2.decks[x[1]]) per[x[1]] = (per[x[1]] || 0) + 1; });
  return [["m", m] as [string, number]].concat(Object.keys(TAP2.decks).filter((d) => per[d]).map((d) => [d, per[d]] as [string, number]));
}
export function txExpand(L: unknown): string[] {
  if (!Array.isArray(L) || L.length > 100 || !L.every((e) => Array.isArray(e) && typeof e[0] === "string" && /^[a-z0-9]{1,12}$/.test(e[0]) && Number.isInteger(e[1]) && e[1] >= 0 && e[1] <= 5000)) throw new Error("format");
  if (L.reduce((a, e) => a + e[1], 0) > 20000) throw new Error("format"); // fremder Link: nicht ins Unendliche aufblähen
  return (L as [string, number][]).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => (k === "m" ? "m" + i : "k:" + k + i)));
}
const clampB = (r: QRec) => Math.max(0, Math.min(5, r.b != null ? r.b : r.s >= 2 ? 2 : r.s === 1 ? 1 : 0));
const clampOff = (n: number) => Math.max(-127, Math.min(127, n));
const ID_OK = /^[A-Za-z0-9:_-]{1,60}$/;

/** Lernstand → Code. full: auch Prüfungen, Fehlerprotokoll, eigene Fragen, Lernstatistik (nur im Link, nicht im QR). */
export async function txEncode(S: State, full: boolean, g: unknown = null, at = today()): Promise<string> {
  const L = txLens(), ids = txExpand(L), q: number[] = [];
  let prev = -1;
  ids.forEach((id, i) => {
    const r = S.q[id]; if (!r || r.s === -1 || r.s == null) return;
    let delta = i - prev; while (delta > 255) { q.push(255, 0xff, 0); delta -= 255; } // Sprungmarke
    const b = clampB(r);
    if (r.t) q.push(delta, b, clampOff(daysBetween(at, iso(new Date(r.t)))) + 128);
    else q.push(delta, b | 0x80, clampOff(r.d ? daysBetween(at, r.d) : 0) + 128); // ohne Zeitstempel: Fälligkeit statt letzter Antwort
    prev = i;
  });
  const marks = new Uint8Array(Math.ceil(ids.length / 8)); ids.forEach((id, i) => { if (S.mark[id]) marks[i >> 3] |= 1 << (i & 7); });
  const meta: Record<string, unknown> = { a: at, n: ids.length, L, u: Object.fromEntries(Object.entries(S.ueb || {}).map(([k, v]) => [k, [v.p, v.at]])) };
  if (g) meta.g = g;
  const known = new Set(ids), extra: Record<string, number[]> = {};
  Object.entries(S.q).forEach(([id, r]) => { if (known.has(id) || !r || r.s === -1 || r.s == null || !ID_OK.test(id)) return; const b = clampB(r); extra[id] = r.t ? [b, clampOff(daysBetween(at, iso(new Date(r.t))))] : [b, clampOff(r.d ? daysBetween(at, r.d) : 0), 1]; });
  if (Object.keys(extra).length) meta.v = extra; // Event-Fragen (ev:…) und eigene Fragen
  if (full) { meta.r = (S.runs || []).slice(-30); meta.e = (S.errlog || []).slice(-60); meta.c = S.custom || {}; meta.l = Object.fromEntries(Object.entries(S.log || {}).slice(-40)); }
  const mj = new TextEncoder().encode(JSON.stringify(meta));
  const raw = new Uint8Array(2 + mj.length + q.length + marks.length);
  raw[0] = mj.length >> 8; raw[1] = mj.length & 255; raw.set(mj, 2); raw.set(q, 2 + mj.length); raw.set(marks, 2 + mj.length + q.length);
  const z = await deflate(raw);
  return (z ? "1" : "0") + b64u.enc(z || raw);
}

export type TxIn = { at: string; q: Record<string, QRec>; mark: Record<string, 1>; ueb: Record<string, [number, string]>; runs: Run[]; errlog: ErrEntry[]; custom: Record<string, CustomCard[]>; log: Record<string, number>; full: boolean; g: Record<string, unknown> | null };
/** Link oder Code → übertragener Stand (alles entschärft). Fehler: "format" (ungültig) oder "nozip" (Browser kann nicht entpacken). */
export async function txDecode(code0: string): Promise<TxIn> {
  let code = String(code0 || "").trim();
  const m = code.match(/import=([A-Za-z0-9_-]+)/); if (m) code = m[1];
  if (!/^[01][A-Za-z0-9_-]+$/.test(code)) throw new Error("format");
  let raw: Uint8Array = b64u.dec(code.slice(1));
  if (code[0] === "1") { const z = await deflate(raw, true).catch(() => { throw new Error("format"); }); if (!z) throw new Error("nozip"); raw = z; }
  const ml = (raw[0] << 8) | raw[1], meta = JSON.parse(new TextDecoder().decode(raw.subarray(2, 2 + ml)));
  if (!isObj(meta) || !Number.isInteger(meta.n) || (meta.n as number) < 0 || (meta.n as number) > 20000) throw new Error("format");
  const n = meta.n as number, a = dayStr(meta.a) || today();
  const ids = meta.L ? txExpand(meta.L) : txExpand(txLens()), nIds = Math.min(n, ids.length), qs: Record<string, unknown> = {}, mBytes = Math.ceil(n / 8);
  const qb = raw.subarray(2 + ml, raw.length - mBytes), mb = raw.subarray(raw.length - mBytes);
  const rec = (b: number, day: string, legacy: boolean) => (legacy ? { b, s: b >= 2 ? 2 : b, d: day, n: 1, w: 0 } : { b, s: b >= 2 ? 2 : b, d: addDays(day, IV[b]), t: new Date(day + "T12:00:00").getTime(), n: 1, w: 0 });
  let idx = -1;
  for (let k = 0; k + 2 < qb.length; k += 3) {
    if (qb[k] === 255 && qb[k + 1] === 0xff) { idx += 255; continue; }
    idx += qb[k]; if (idx >= nIds) continue;
    const legacy = !!(qb[k + 1] & 0x80), b = Math.min(5, qb[k + 1] & 0x7f);
    qs[ids[idx]] = rec(b, addDays(a, qb[k + 2] - 128), legacy);
  }
  Object.entries(isObj(meta.v) ? meta.v : {}).forEach(([id, x]) => {
    if (!ID_OK.test(id) || !Array.isArray(x) || qs[id]) return;
    const b = Math.max(0, Math.min(5, num(x[0]))), day = addDays(a, clampOff(num(x[1])));
    qs[id] = rec(b, day, !!x[2]);
  });
  const mark: Record<string, 1> = {}; for (let i = 0; i < nIds; i++) if (mb[i >> 3] & (1 << (i & 7))) mark[ids[i]] = 1;
  return {
    at: a, q: mapObj(qs, cleanQ), mark,
    ueb: mapObj(meta.u, (x) => (Array.isArray(x) ? [num(x[0]), pastDay(x[1])] as [number, string] : null)),
    runs: arr(meta.r).map(cleanRun).filter(Boolean) as Run[], errlog: arr(meta.e).map(cleanErr).filter(Boolean) as ErrEntry[],
    custom: cleanCustom(meta.c, NORMALIZE_CTX.knownTopics), log: cleanLog(meta.l), full: Array.isArray(meta.r), g: isObj(meta.g) ? (meta.g as Record<string, unknown>) : null,
  };
}

/** Übernehmen: Zusammenführen (pro Frage gilt der neuere Stand, nichts geht verloren) oder Ersetzen (eigene Event-Stände bleiben) */
export function txApply(S0: State, inc: TxIn, mode: "merge" | "replace"): State {
  if (mode === "replace") {
    const n = blank();
    n.q = { ...Object.fromEntries(Object.entries(S0.q).filter(([id]) => id.startsWith("ev:"))), ...inc.q }; n.mark = inc.mark;
    n.ueb = Object.fromEntries(Object.entries(inc.ueb).map(([k, [p, at]]) => [k, { p, at, n: 1 }]));
    n.runs = inc.runs; n.errlog = inc.errlog; n.custom = inc.custom; n.log = inc.log;
    return normalize(n, NORMALIZE_CTX);
  }
  const S: State = structuredClone(S0);
  const dayOf = (r: QRec | undefined) => (r && r.t ? iso(new Date(r.t)) : "");
  Object.entries(inc.q).forEach(([id, r]) => {
    const L = S.q[id];
    if (!L || L.s === -1) { S.q[id] = r; return; }
    const a = dayOf(L), b = dayOf(r);
    if (b > a || (b === a && (r.b || 0) > (L.b || 0))) S.q[id] = { ...L, b: r.b, s: r.s, d: r.d, t: r.t || L.t };
  });
  Object.assign(S.mark, inc.mark);
  Object.entries(inc.ueb).forEach(([k, [p, at]]) => { const L = S.ueb[k]; if (!L || (at || "") > (L.at || "")) S.ueb[k] = { ...(L || {}), p, at, n: (L && L.n) || 1 }; });
  const runKeys = new Set(S.runs.map((x) => x.ts)); inc.runs.forEach((x) => { if (!runKeys.has(x.ts)) S.runs.push(x); }); S.runs.sort((x, y) => (x.ts || 0) - (y.ts || 0));
  const ek = (x: ErrEntry) => x.at + "|" + x.src + "|" + x.ref, eKeys = new Set(S.errlog.map(ek)); inc.errlog.forEach((x) => { if (!eKeys.has(ek(x))) S.errlog.push(x); });
  Object.entries(inc.custom).forEach(([t, l]) => { const have = new Set((S.custom[t] || []).map((c) => c.id)); S.custom[t] = (S.custom[t] || []).concat((l || []).filter((c) => !have.has(c.id))); });
  Object.entries(inc.log).forEach(([d, n]) => { S.log[d] = Math.max(S.log[d] || 0, n); });
  return S;
}
export const txSummary = (inc: TxIn) => { const n = Object.keys(inc.q).length, g = Object.values(inc.q).filter((r) => r.s === 2).length, rn = inc.runs.length, cn = Object.values(inc.custom || {}).flat().length; return `${n} Fragen bearbeitet, davon ${g} grün${rn ? `, ${rn} Prüfungen` : ""}${cn ? `, ${cn} eigene Fragen` : ""}`; };
