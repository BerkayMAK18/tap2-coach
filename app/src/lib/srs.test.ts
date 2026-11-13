/** Wiederholungs-Engine: Regeln wie in der Live-App. */
import { describe, expect, it } from "vitest";
import { addDays, today } from "./dates";
import { answer, counts, guess, nextTxt, openOrder, prio } from "./srs";
import { blank } from "./state";

describe("answer", () => {
  it("neue Frage richtig → gelb, morgen wieder", () => {
    const { q } = answer(blank(), "m1", true);
    expect(q).toMatchObject({ s: 1, b: 1, n: 1, w: 0, d: addDays(today(), 1) });
  });
  it("zweimal richtig → grün, in 3 Tagen", () => {
    const S = blank(); S.q.m1 = answer(S, "m1", true).q;
    expect(answer(S, "m1", true).q).toMatchObject({ s: 2, b: 2, d: addDays(today(), 3) });
  });
  it("falsch → rot, heute noch einmal, Fehler gezählt", () => {
    const S = blank(); S.q.m1 = { s: 2, b: 4, d: today(), n: 5, w: 0 };
    expect(answer(S, "m1", false).q).toMatchObject({ s: 0, b: 0, w: 1, d: today() });
  });
  it("unsicher richtig → Box 1 (gelb)", () => {
    const S = blank(); S.q.m1 = { s: 2, b: 4, d: today() };
    expect(answer(S, "m1", true, true).q).toMatchObject({ s: 1, b: 1 });
  });
  it("Events zählen nicht zur Tagesstatistik", () => {
    expect(answer(blank(), "ev:lf11a:mod1", true).logDay).toBeNull();
    expect(answer(blank(), "m1", true).logDay).toBe(today());
  });
});

describe("War geraten / nächste Wiederholung", () => {
  it("geraten → Box 1, gelb, morgen wieder (auch wenn die Frage vorher grün war)", () => {
    const S = blank(); S.q.m1 = answer(S, "m1", true).q; S.q.m1 = answer(S, "m1", true).q;
    expect(guess(S.q.m1)).toMatchObject({ s: 1, b: 1, d: addDays(today(), 1), n: 2 });
  });
  it("Text der nächsten Wiederholung wie in der Live-App", () => {
    const S = blank(); S.q.a = { s: 0, d: today() }; S.q.b = { s: 1, d: addDays(today(), 1) }; S.q.c = { s: 2, d: addDays(today(), 7) };
    expect(["a", "b", "c", "neu"].map((id) => nextTxt(S, id))).toEqual(["heute noch einmal", "wieder morgen", "wieder in 7 Tagen", ""]);
  });
});

describe("Runden", () => {
  it("Reihenfolge: rot, fällig, neu, gelb, grün", () => {
    const S = blank();
    S.q.rot = { s: 0, d: today() }; S.q.faellig = { s: 2, d: today() }; S.q.gelb = { s: 1, d: addDays(today(), 1) }; S.q.gruen = { s: 2, d: addDays(today(), 5) };
    expect(["rot", "faellig", "neu", "gelb", "gruen"].map((id) => prio(S, id))).toEqual([0, 1, 2, 3, 4]);
    expect(openOrder(S, [{ id: "gruen" }, { id: "gelb" }, { id: "rot" }]).map((q) => q.id)).toEqual(["rot", "gelb"]);
  });
  it("Prüfungsreife: grün zählt voll, gelb halb", () => {
    const S = blank(); S.q.a = { s: 2 }; S.q.b = { s: 1 };
    expect(counts(S, [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]).pct).toBe(0.375);
  });
});
