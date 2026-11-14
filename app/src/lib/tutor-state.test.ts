/** Tutor-Stand: Merge-Regel für mehrere Geräte (kommutativ, assoziativ, idempotent), Fremddaten, XP-Obergrenze. */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { seeded } from "./gami/golden/harness";
import { stab } from "./gami/state";
import { kbIds, makeKb, paketeOf } from "./tutor-kb";
import { addEvidence, addXpDay, emptyTutor, fvActive, fvCount, mergeTutor, migrateOld, normalizeTutor, putSession, xpToday, type Ev, type TutorState } from "./tutor-state";

const kb = makeKb(TAP2), known = kbIds(kb);
const T = "T03", K = `${paketeOf(kb, T)[0]}.1`, K2 = `${paketeOf(kb, T)[0]}.2`;
const ev = (id: string, at: number, o: Partial<Ev> = {}): Ev => ({ id, at, k: K, t: T, art: "beleg", w: 0.5, ...o });

/** Zufälliger Gerätestand aus einer gemeinsamen Grundmenge (damit sich Geräte überschneiden) */
function randomState(seed: number): TutorState {
  const r = seeded(seed); let s = emptyTutor();
  for (let i = 0; i < 25; i++) {
    const n = Math.floor(r() * 40), at = 1_700_000_000_000 + n * 1000, x = r();
    if (x < 0.5) s = addEvidence(s, [ev(`e${n}`, at, { w: Math.round(r() * 10) / 10 })]);
    else if (x < 0.7) s = addEvidence(s, [ev(`f${n}`, at, { art: "fehlvorstellung", w: -0.5, f: `fv${n % 3}`, n: `Fehler ${n}` })]);
    else if (x < 0.8) s = addEvidence(s, [ev(`h${n}`, at, { art: "behoben", w: 0.5, f: `fv${n % 3}` })]);
    else if (x < 0.9) s = putSession(s, { id: `s${n % 4}`, t: T, start: at, aufgaben: Math.floor(r() * 6), punkte: Math.floor(r() * 20), max: 20, xp: Math.floor(r() * 60) });
    else s = addXpDay(s, `2026-11-${10 + (n % 4)}`, `dev${seed % 3}x`, Math.floor(r() * 30) + 1);
  }
  return s;
}

describe("mergeTutor", () => {
  const S = [1, 2, 3, 4, 5, 6].map(randomState);
  it("kommutativ: A+B = B+A", () => { for (const a of S) for (const b of S) expect(stab(mergeTutor(a, b))).toBe(stab(mergeTutor(b, a))); });
  it("assoziativ: (A+B)+C = A+(B+C)", () => { for (let i = 0; i < 4; i++) { const [a, b, c] = [S[i], S[i + 1], S[i + 2]]; expect(stab(mergeTutor(mergeTutor(a, b), c))).toBe(stab(mergeTutor(a, mergeTutor(b, c)))); } });
  it("idempotent: A+A = A und (A+B)+B = A+B", () => { for (const a of S) { expect(stab(mergeTutor(a, a))).toBe(stab(mergeTutor(a, emptyTutor()))); const ab = mergeTutor(a, S[0]); expect(stab(mergeTutor(ab, S[0]))).toBe(stab(ab)); } });
  it("nichts geht verloren: alle Belege beider Geräte sind danach da", () => {
    const a = addEvidence(emptyTutor(), [ev("a1", 1), ev("a2", 3)]), b = addEvidence(emptyTutor(), [ev("b1", 2)]);
    expect(mergeTutor(a, b).ev.map((e) => e.id)).toEqual(["a1", "b1", "a2"]);
  });
  it("Fehlvorstellung: auf Gerät A behoben, auf B später wieder aufgetreten → wieder offen; Anzahl aus den Belegen", () => {
    let base = addEvidence(emptyTutor(), [ev("f1", 100, { art: "fehlvorstellung", w: -0.5, f: "fvx", n: "2NF falsch" })]);
    const a = addEvidence(base, [ev("h1", 200, { art: "behoben", w: 0.5, f: "fvx" })]);
    expect(fvActive(a.fv.fvx)).toBe(false);
    const b = addEvidence(base, [ev("f2", 300, { art: "fehlvorstellung", w: -0.5, f: "fvx", n: "2NF falsch (wieder)" })]);
    base = mergeTutor(a, b);
    expect(fvActive(base.fv.fvx)).toBe(true); expect(base.fv.fvx.text).toBe("2NF falsch (wieder)"); expect(fvCount(base, "fvx")).toBe(2);
    expect(base.fv.fvx.first).toBe(100);
  });
  it("Sitzung: Zähler je Sitzung als Maximum (sie läuft auf einem Gerät weiter)", () => {
    const x = { id: "s1", t: T, start: 5, aufgaben: 2, punkte: 6, max: 10, xp: 18 };
    const a = putSession(emptyTutor(), x), b = putSession(emptyTutor(), { ...x, aufgaben: 4, punkte: 11, max: 18, xp: 33, end: 99 });
    expect(mergeTutor(a, b).sess.s1).toMatchObject({ aufgaben: 4, punkte: 11, xp: 33, end: 99 });
  });
});

describe("Tutor-XP je Tag (alle Geräte)", () => {
  it("je Gerät das Maximum, Summe über Geräte (Anzeige „Tutor-XP heute“)", () => {
    let a = addXpDay(emptyTutor(), "2026-11-14", "geraetA", 120); const b = addXpDay(emptyTutor(), "2026-11-14", "geraetB", 150);
    a = addXpDay(a, "2026-11-14", "geraetA", 30);
    const m = mergeTutor(mergeTutor(a, b), a);
    expect(xpToday(m, "2026-11-14")).toBe(300); expect(xpToday(m, "2026-11-15")).toBe(0);
  });
  it("nur die letzten 14 Tage", () => {
    let s = emptyTutor(); for (let d = 1; d <= 20; d++) s = addXpDay(s, `2026-11-${String(d).padStart(2, "0")}`, "geraetA", 5);
    expect(Object.keys(s.xp).length).toBe(14); expect(Object.keys(s.xp)[0]).toBe("2026-11-07");
  });
});

describe("normalizeTutor (Fremddaten aus Cloud/Speicher)", () => {
  it("ungültige Einträge fallen einzeln weg, gültige bleiben", () => {
    const s = normalizeTutor({ ev: [ev("ok", 1), { ...ev("bad", 2), k: "P999.9" }, { ...ev("bad2", 3), w: 7 }, { id: "x y", at: 1 }, "müll"], fv: { a: { id: "a", t: T, text: "t", first: 1, seen: 2 }, b: { id: "b", t: "T99", text: "t", first: 1, seen: 2 } }, xp: { "2026-11-14": { geraetA: 10, "<x>": 5 }, nope: { geraetA: 1 } } }, known);
    expect(s.ev.map((e) => e.id)).toEqual(["ok"]); expect(Object.keys(s.fv)).toEqual(["a"]); expect(s.xp).toEqual({ "2026-11-14": { geraetA: 10 } });
    expect(normalizeTutor(null, known)).toEqual(emptyTutor());
  });
});

describe("Übernahme des alten Lernpfads", () => {
  it("Belege und Fehlvorstellungen, feste IDs (zwei Geräte → derselbe Stand)", () => {
    const pfad = { evidence: [{ at: "2026-11-13", thema: T, punkte: 3, max: 4 }, { at: "2026-11-13", thema: "T99", punkte: 1, max: 1 }], miscon: [{ at: "2026-11-12", thema: T, aussage: "2NF heißt atomar" }] };
    const a = migrateOld(pfad, { miscon: [{ thema: T, aussage: "2NF heißt atomar" }] }, known), b = migrateOld(pfad, null, known);
    expect(a.ev.length).toBe(1); expect(a.ev[0]).toMatchObject({ art: "bewertung", w: 0.75, t: T });
    expect(Object.values(a.fv).map((f) => f.text)).toEqual(["2NF heißt atomar"]);
    expect(stab(mergeTutor(a, b))).toBe(stab(a));
    void K2;
  });
});
