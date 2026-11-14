import { describe, expect, it } from "vitest";
import { EVENTS } from "@/content/catalog";
import { EV_FINAL, evAllQ, evOn, evPassFallback, evReady, evStatusTxt, kapMastered, learnEv, learnEvFinal } from "./events";
import { blank, type State } from "./state";

const e = EVENTS[0];
const sureState = (share: number): State => {
  const q: State["q"] = {};
  e.kapitel.forEach((k) => k.items.slice(0, Math.ceil(k.items.length * share)).forEach((x) => (q[x.id] = { s: 1, b: 1 })));
  return { ...blank(), q };
};

describe("Events", () => {
  it("nur freigeschaltete Events (WPF ist im Export abgeschaltet)", () => {
    expect(EVENTS.map((x) => x.id)).toEqual(["lf11a"]);
  });
  it("Zeitraum und Status-Text", () => {
    expect([evOn(e, e.start), evOn(e, e.ende), evOn(e, "2026-01-01")]).toEqual([true, true, false]);
    expect(evStatusTxt(e, {}, "2026-12-16")).toBe("noch 2 Tage");
    expect(evStatusTxt(e, {}, "2026-12-17")).toBe("noch 1 Tag");
    expect(evStatusTxt(e, {}, e.ende)).toBe("letzter Tag");
    expect(evStatusTxt(e, {}, "2027-01-01")).toBe("beendet");
    expect(evStatusTxt(e, {}, "2026-11-01")).toBe("startet am 10. November");
    expect(evStatusTxt(e, { got: 1 }, "2027-01-01")).toBe("Belohnung erhalten");
  });
  it("Kapitel- und gemischte Runde mit Event-Quelle", () => {
    const k = e.kapitel[0], p = learnEv(blank(), e, k.id)!;
    expect(p.list).toHaveLength(k.items.length);
    expect(p.src).toEqual({ kind: "ev", ev: e.id, kap: k.id });
    expect(p.title).toBe(e.kurz + " · " + k.titel);
    const m = learnEv(blank(), e)!;
    expect(m.list.length).toBe(20);
    expect(m.src).toEqual({ kind: "ev", ev: e.id });
    expect(learnEv(blank(), e, "gibtsnicht")).toBeNull();
  });
  it("Abschlusstest erst ab 80 % je Kapitel, 15 Auswahlfragen, aus jedem Kapitel mindestens zwei", () => {
    expect(evReady(sureState(0.7), e)).toBe(false);
    expect(learnEvFinal(sureState(0.7), e)).toBeNull();
    const S = sureState(0.8);
    expect(evReady(S, e)).toBe(true);
    const p = learnEvFinal(S, e)!;
    expect(p.list).toHaveLength(EV_FINAL);
    expect(p.list.every((q) => q.type === "mc")).toBe(true);
    expect(new Set(p.list.map((q) => q.id)).size).toBe(EV_FINAL);
    e.kapitel.forEach((k) => { const n = p.list.filter((q) => k.items.some((x) => x.id === q.id)).length; expect(n).toBeGreaterThanOrEqual(Math.min(2, k.items.filter((q) => q.type === "mc").length)); });
    expect(p.src).toEqual({ kind: "ev", ev: e.id, final: true });
  });
  it("bestanden ab 80 % sicher richtig; Kapitel gemeistert, wenn alle gelb oder grün", () => {
    expect([evPassFallback(12, 15), evPassFallback(11, 15)]).toEqual([true, false]);
    const k = e.kapitel[0];
    expect(kapMastered(sureState(1), e, k.id)).toBe(true);
    expect(kapMastered(sureState(0.8), e, k.id)).toBe(false);
  });
  it("Event-Fragen zählen nicht zur Prüfungsreife (eigene IDs ev:…)", () => {
    expect(evAllQ(e).every((q) => q.id.startsWith("ev:" + e.id + ":"))).toBe(true);
  });
});
