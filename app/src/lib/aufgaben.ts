/**
 * Aufgaben (Übungsaufgaben) und Fehlerprotokoll – Regeln wie in rUeb(), logCause() und reportUrlUeb() der Live-App.
 * Reine Funktionen ohne Speicher-Zugriff; der Store (store/progress.ts) wendet sie an.
 */
import { TAP2, TOPICS } from "@/content/catalog";
import type { Aufgabe, Topic } from "@/content/schema";
import { today } from "./dates";
import { clip, issueUrl, quote } from "./lernen";
import type { ErrEntry, State } from "./state";

// ---------- Fehlerursachen (CAUSES / CAUSE_TIP der Live-App, gleiche Schlüssel – sie stehen im Lernstand)
export const CAUSES = {
  wissen: ["Wissen gefehlt", "book"],
  operator: ["Operator verfehlt", "bulb"],
  aufgabe: ["Aufgabe falsch verstanden", "eye"],
  zeit: ["Zeit gefehlt", "clock"],
  fluecht: ["Flüchtigkeitsfehler", "alert"],
} as const satisfies Record<string, readonly [string, string]>;
export type Cause = keyof typeof CAUSES;
export const isCause = (c: unknown): c is Cause => typeof c === "string" && Object.prototype.hasOwnProperty.call(CAUSES, c);
/** Tipp je Ursache und Ziel-Ansicht des „Los“-Knopfs (wird in Tipps → Fehlerprotokoll gezeigt) */
export const CAUSE_TIP: Record<Cause, [string, string]> = {
  wissen: ["Theorie des Themas lesen und Lernrunden machen, bis die Ampel grün ist.", "lernen"],
  operator: ["Operator-Trainer: Welche Antworttiefe verlangt „Nennen“, „Erläutern“, „Beurteilen“?", "operatoren"],
  aufgabe: ["Aufgabentext zweimal lesen, Operator und Punkte markieren, Bezug zur Situation herstellen.", "tipps"],
  zeit: ["Aufgaben mit Timer üben: Punkte = Minuten als Richtwert, nicht an einer Teilaufgabe festbeißen.", "aufgaben"],
  fluecht: ["Am Ende 5 Minuten zur Kontrolle einplanen: Einheiten, Vorzeichen, Schleifengrenzen, Semikolons.", "tipps"],
};

/** Sync-Ereignis zum Fehlerprotokoll: Schlüssel „Tag|Quelle|Bezug“, Wert der Eintrag oder null (gelöscht) */
export type ErrEv = [string, ErrEntry | null];
/**
 * Ursache für einen Punktverlust eintragen (logCause() der Live-App): Ein Eintrag je Quelle, Bezug und Tag –
 * ein neuer ersetzt den von heute, ohne Ursache wird er entfernt.
 */
export function logCause(errlog: ErrEntry[], src: string, ref: string, pts: number, cause: Cause | null, day = today()): { errlog: ErrEntry[]; ev: ErrEv } {
  const next = errlog.filter((x) => !(x.src === src && x.ref === ref && x.at === day));
  const e: ErrEntry | null = cause ? { at: day, src, ref, pts, cause } : null;
  if (e) next.push(e);
  return { errlog: next, ev: [day + "|" + src + "|" + ref, e] };
}

// ---------- Aufgaben
export const UEB: Aufgabe[] = TAP2.ueb;
export const UE: Record<string, Aufgabe> = Object.fromEntries(UEB.map((u) => [u.id, u]));
const PK = Object.fromEntries(TAP2.pakete.map((p) => [p.id, p]));
/** Aufgaben eines Themas: aus seinen Lernpaketen, ohne Doppelte (t.ueb in der Live-App) */
export const uebOf = (t: Topic) => [...new Set(t.th.flatMap((id) => (PK[id] ? PK[id].ueb ?? [] : [])))].filter((u) => UE[u]);
/** Thema mit der Theorie zu einer Aufgabe: das erste Thema, das sie enthält (UEB_TOPIC) */
export const UEB_TOPIC: Record<string, string> = {};
TOPICS.forEach((t) => uebOf(t).forEach((u) => { if (!UEB_TOPIC[u]) UEB_TOPIC[u] = t.id; }));

/** Gruppen der Übersicht nach Thema, in Katalog-Reihenfolge */
export function uebGroups(list: Aufgabe[] = UEB): [string, Aufgabe[]][] {
  const g: Record<string, Aufgabe[]> = {};
  list.forEach((u) => (g[u.thema] = g[u.thema] || []).push(u));
  return Object.entries(g);
}
/** Farbe des Ergebnis-Chips: ab 81 % ok, ab 67 % warn, sonst bad */
export const uebChip = (p: number, max: number) => { const pct = p / max; return pct >= 0.81 ? "ok" : pct >= 0.67 ? "warn" : "bad"; };

/** Eingabe „Deine Punkte“ auswerten: auf 0…max begrenzt, keine Zahl → null (nichts speichern) */
export function parsePts(raw: string, max: number): number | null {
  const v = Math.max(0, Math.min(max, parseFloat(raw)));
  return Number.isNaN(v) ? null : v;
}
/** Punkte speichern wie in der Live-App: neuer Eintrag (eine frühere Ursache entfällt), Versuche hochzählen */
export function saveUebRec(S: State, id: string, p: number, day = today()): State {
  const r = S.ueb[id];
  return { ...S, ueb: { ...S.ueb, [id]: { p, at: day, n: (r?.n || 0) + 1 } } };
}
/** Ursache an der Aufgabe setzen bzw. bei erneutem Klick entfernen, mit Eintrag im Fehlerprotokoll */
export function setUebCauseRec(S: State, id: string, c: Cause, day = today()): { S: State; ev: ErrEv } | null {
  const u = UE[id], r = S.ueb[id];
  if (!u || !r) return null;
  const cause = r.cause === c ? null : c;
  const { errlog, ev } = logCause(S.errlog, "ueb", u.id + " " + u.titel, u.max - r.p, cause, day);
  const rec = { ...r };
  if (cause) rec.cause = cause; else delete rec.cause;
  return { S: { ...S, ueb: { ...S.ueb, [id]: rec }, errlog }, ev };
}

/** „Fehler melden“ zu einer Aufgabe (reportUrlUeb() der Live-App) */
export function reportUrlUeb(u: Aufgabe) {
  return issueUrl("Fehler in Aufgabe " + u.id + ": " + clip(u.titel, 60), ["**Aufgabe:** `" + u.id + "` – " + u.titel, "**Thema:** " + u.thema, "", "**Aufgabentext (Anfang):**", quote(clip(u.text, 600))]);
}
