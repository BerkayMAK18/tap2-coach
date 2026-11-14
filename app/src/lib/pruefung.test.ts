import { describe, expect, it } from "vitest";
import { BASE_Q, TAP2 } from "@/content/catalog";
import { blank, type Run, type State } from "./state";
import { buildAufgabe, finishReal, fmtT, left, n1ok, opHint, pause, pickMC, realStats, restoreRun, resume, runsFor, setGot, startRun, steps, submitRun, toggleCause, type PkRun } from "./pruefung";

const mcOf = (id: string) => BASE_Q.find((q) => q.id === id)!;

describe("Simulation erzeugen (pickMC)", () => {
  it("30 verschiedene Auswahlfragen des Teils, richtige Antwort bleibt nach dem Mischen richtig", () => {
    const qs = pickMC(blank(), "t1", 30);
    expect(qs).toHaveLength(30);
    expect(new Set(qs.map((q) => q.id)).size).toBe(30);
    qs.forEach((q) => {
      const o = mcOf(q.id);
      expect(o.type === "mc" && o.teil).toBe("t1");
      if (o.type === "mc") { expect(q.opts[q.right]).toBe(o.opts[o.right]); expect([...q.opts].sort()).toEqual([...o.opts].sort()); }
      expect(q.pick).toBeNull();
    });
  });
  it("je Teil reihum über die Themen: kein Thema doppelt, solange andere noch fehlen", () => {
    const qs = pickMC(blank(), "t2", 30), topics = new Set(BASE_Q.filter((q) => q.type === "mc" && q.teil === "t2").map((q) => q.topic));
    const per = qs.reduce<Record<string, number>>((a, q) => ({ ...a, [q.topic]: (a[q.topic] || 0) + 1 }), {});
    expect(Object.keys(per).length).toBe(Math.min(30, topics.size));
  });
  it("rote Fragen werden bevorzugt", () => {
    const red = BASE_Q.filter((q) => q.type === "mc" && q.teil === "wiso").slice(0, 10);
    const S: State = { ...blank(), q: Object.fromEntries(BASE_Q.filter((q) => q.type === "mc").map((q) => [q.id, { s: 2, b: 3 }])) };
    red.forEach((q) => (S.q[q.id] = { s: 0, b: 0 }));
    const ids = new Set(pickMC(S, "wiso", 30).map((q) => q.id));
    expect(red.every((q) => ids.has(q.id))).toBe(true); // rot: Gewicht 3–5, grün: 1–3
  });
});

describe("Real-Klausur erzeugen", () => {
  it("vier Aufgaben (je Kategorie eine) mit höchstens 25 Punkten", () => {
    const r = startRun(blank(), "real", "t2", 1000);
    expect(r.auf!.map((a) => a.cat).sort()).toEqual(Object.keys(TAP2.cats.t2).sort());
    r.auf!.forEach((a) => { const p = a.items.reduce((s, i) => s + i.p, 0); expect(p).toBeGreaterThan(0); expect(p).toBeLessThanOrEqual(25); });
    expect(r).toMatchObject({ mode: "real", teil: "t2", total: 90 * 60000, used: 0, start: 1000, on: true, phase: "write" });
  });
  it("SQL-Aufgabe zeigt die Tabellen", () => {
    expect(buildAufgabe("t2", "sql").items.some((i) => i.schema)).toBe(true);
  });
});

describe("Uhr", () => {
  it("Restzeit, Pause, Weiter und Anzeige wie in der Live-App", () => {
    const r = startRun(blank(), "sim", "wiso", 0);
    expect(r.total).toBe(60 * 60000);
    expect(left(r, 60000)).toBe(59 * 60000);
    const p = pause(r, 60000);
    expect([p.on, p.used, left(p, 999999)]).toEqual([false, 60000, 59 * 60000]);
    expect(left(resume(p, 100000), 160000)).toBe(58 * 60000);
    expect([fmtT(90 * 60000), fmtT(61500), fmtT(-5)]).toEqual(["01:30:00", "00:01:02", "00:00:00"]);
  });
  it("Neuladen: nur schreibende/bewertende Prüfung, Uhr angehalten", () => {
    const r = startRun(blank(), "sim", "t1", 0);
    expect(restoreRun(r, 5000)).toMatchObject({ on: false, used: 5000 });
    expect(restoreRun({ ...r, phase: "done" })).toBeNull();
    expect(restoreRun({ mode: "x", phase: "write" })).toBeNull();
    expect(restoreRun("kaputt")).toBeNull();
  });
});

describe("Abgeben", () => {
  it("Simulation: Note, Detail, Antworten zählen in den Lernstand", () => {
    const r0 = startRun(blank(), "sim", "t1", 0);
    const qs = r0.qs!.map((q, i) => ({ ...q, pick: i < 28 ? q.right : i === 28 ? (q.right + 1) % q.opts.length : null }));
    const { S, run } = submitRun(blank(), { ...r0, qs }, false, 120000, "2026-11-14");
    expect(run).toMatchObject({ phase: "done", pct: 93, auto: false, on: false, used: 120000 });
    expect(S.runs).toEqual([{ mode: "sim", teil: "t1", pct: 93, note: 1, at: "2026-11-14", ts: 120000, detail: "28/30" }]);
    expect(Object.keys(S.q)).toHaveLength(29); // unbeantwortete zählen nicht
    expect(S.q[qs[28].id].s).toBe(0);
  });
  it("Real-Klausur: erst bewerten, Ursachen ins Fehlerprotokoll, Ergebnis mit Punkten", () => {
    let r: PkRun = submitRun(blank(), startRun(blank(), "real", "t1", 42), true, 60000).run;
    expect(r).toMatchObject({ phase: "grade", auto: true });
    const { all, total } = realStats(r);
    r.auf!.forEach((a, ai) => a.items.forEach((it, ii) => { r = setGot(r, ai, ii, it.p); }));
    r = setGot(r, 0, 0, r.auf![0].items[0].p - 2);
    r = toggleCause(r, 0, 0, "zeit");
    r = setGot(r, 1, 0, 99); // begrenzt
    expect(realStats(r)).toMatchObject({ graded: all.length, got: total - 2 });
    const x = finishReal(blank(), r, 77, "2026-11-14");
    expect(x.run.phase).toBe("done");
    expect(x.S.errlog).toEqual([{ at: "2026-11-14", src: "real", ref: "Real-Klausur Planen · 1a · 42", pts: 2, cause: "zeit" }]);
    expect(x.evs).toHaveLength(1);
    const run = x.S.runs[0];
    expect(run).toMatchObject({ mode: "real", teil: "t1", at: "2026-11-14", ts: 77, detail: total - 2 + "/" + total + " P" });
    expect(run.pct).toBe(Math.round(((total - 2) / total) * 100));
  });
  it("Ursache ohne Punktverlust oder zweimal geklickt landet nicht im Protokoll", () => {
    let r: PkRun = submitRun(blank(), startRun(blank(), "real", "t2", 1), false, 2).run;
    r.auf!.forEach((a, ai) => a.items.forEach((it, ii) => { r = setGot(r, ai, ii, it.p); }));
    r = toggleCause(r, 0, 0, "wissen");
    r = toggleCause(setGot(r, 1, 0, 0), 1, 0, "zeit");
    r = toggleCause(r, 1, 0, "zeit");
    expect(finishReal(blank(), r).S.errlog).toEqual([]);
  });
  it("Bewertungsstufen auf halbe Punkte", () => {
    expect(steps(5)).toEqual([0, 1.5, 2.5, 4, 5]);
    expect(steps(3)).toEqual([0, 1, 1.5, 2.5, 3]);
  });
});

describe("Bereit für eine 1?", () => {
  const run = (mode: string, teil: string, pct: number): Run => ({ mode, teil, pct, note: 1, at: "2026-11-01" });
  it("zwei Real-Klausuren in Folge ab 92 %; SoWi zählt Simulationen, aber kein Quiz", () => {
    const S = { ...blank(), runs: [run("real", "t1", 95), run("sim", "t1", 99), run("real", "t1", 92), run("sim", "wiso", 93), run("sim", "wiso", 94), run("easy", "wiso", 10), run("real", "t2", 95), run("real", "t2", 91)] };
    expect([n1ok(S, "t1"), n1ok(S, "wiso"), n1ok(S, "t2")]).toEqual([true, true, false]);
    expect(runsFor(S, "wiso").map((x) => x.pct)).toEqual([93, 94]);
  });
});

describe("Operator-Hinweis", () => {
  it("erkennt den Operator, Erstellen-Operatoren teilen sich einen Hinweis", () => {
    expect(opHint("Erläutern Sie den Vorteil.")![0]).toBe("Erläutern");
    expect(opHint("Wägen Sie ab.")![0]).toBe("Abwägen");
    expect(opHint("Zeichnen Sie ein Klassendiagramm.")![0]).toBe("Erstellen");
    expect(opHint("Was ist ein Index?")).toBeNull();
  });
});
