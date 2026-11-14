/** Runden zusammenstellen, „Als Nächstes“, Lernplan – Regeln der Live-App. */
import { describe, expect, it } from "vitest";
import { TOPICS, TP, allQ, topicQ } from "@/content/catalog";
import { addDays, today } from "./dates";
import { learnList, learnSel, learnSelOnly, nextRound, nextTopic, onlyList, perDay, qParts, selNames, situBlocks, startTab, tcolOf } from "./lernen";
import { buildPlan, wdOf } from "./plan";
import { ROUND } from "./srs";
import { blank } from "./state";

const T01 = topicQ(blank(), "T01");

describe("Frage-Text", () => {
  it("trennt Situation und Aufgabe an der letzten Leerzeile", () => {
    expect(qParts("Situation\n\nNoch mehr\n\nAufgabe?")).toEqual(["Situation\n\nNoch mehr", "Aufgabe?"]);
    expect(qParts("Nur Aufgabe")).toEqual(["", "Nur Aufgabe"]);
  });
  it("zerlegt Codeblöcke in der Situation", () => {
    expect(situBlocks("Text\n```\nSELECT 1\n```\nmehr")).toEqual([{ code: false, text: "Text" }, { code: true, text: "SELECT 1" }, { code: false, text: "mehr" }]);
  });
  it("Farben der Prüfungsteile", () => {
    expect(["Teil 1", "Teil 2", "Teil 1 + 2", "SoWi", "t1", "wiso"].map(tcolOf)).toEqual(["violet", "blue", "blue", "yellow", "violet", "yellow"]);
  });
});

describe("Runden", () => {
  it("Thema lernen: höchstens 20, Titel = Themenname", () => {
    const p = learnList(blank(), "learn", "T01")!;
    expect(p.list.length).toBe(Math.min(ROUND, T01.length));
    expect(p.title).toBe(TP.T01.n);
    expect(p.src).toEqual({ kind: "learn", tid: "T01" });
  });
  it("Fehler: nur rote, ohne Auffüllen; Titel mit Thema", () => {
    const S = blank(); S.q[T01[0].id] = { s: 0, d: today() }; S.q[T01[1].id] = { s: 1, d: addDays(today(), 1) };
    const p = learnList(S, "err", "T01")!;
    expect(p.list.map((q) => q.id)).toEqual([T01[0].id]);
    expect(p.title).toBe(TP.T01.n + ": Fehlerfragen");
  });
  it("Fällig: nur fällige, ganzer Katalog ohne Präfix", () => {
    const S = blank(); S.q[T01[0].id] = { s: 2, d: today() }; S.q[T01[1].id] = { s: 2, d: addDays(today(), 3) };
    expect(learnList(S, "due")!).toMatchObject({ title: "Fällige Wiederholungen", list: [{ id: T01[0].id }] });
  });
  it("Prüfungsteil gemischt", () => {
    const p = learnList(blank(), "part", "wiso")!;
    expect(p.title).toBe("SoWi · alle Themen gemischt");
    p.list.forEach((q) => expect(TP[q.topic].teil).toBe("SoWi"));
  });
  it("Markiert und Alle", () => {
    const S = blank(); S.mark[T01[2].id] = 1;
    expect(learnList(S, "mark")!.list.map((q) => q.id)).toEqual([T01[2].id]);
    expect(learnList(S, "all", "T01")!.list).toHaveLength(T01.length);
  });
  it("Mehrfachauswahl: Titel aus den kurzen Themennamen", () => {
    const sel = ["T01", TOPICS[1].id];
    expect(selNames(sel)).toBe([TP.T01.n, TOPICS[1].n].map((n) => n.split(/[,&]/)[0].trim()).join(" + "));
    expect(learnSel(blank(), sel).title).toBe("Auswahl: " + selNames(sel));
    expect(learnSelOnly(blank(), sel, "new").title).toBe("Auswahl: " + selNames(sel) + " · Neue Fragen");
    expect(learnSelOnly(blank(), sel, "new").list.length).toBe(ROUND);
    expect(onlyList(blank(), "err", T01)).toEqual([]);
  });
  it("Nächste Runde: Fehler-Runde ohne Fehler → Thema lernen", () => {
    expect(nextRound(blank(), { kind: "err", tid: "T01" })!.src).toEqual({ kind: "learn", tid: "T01" });
    expect(nextRound(blank(), { kind: "search" })!.title).toBe("Gemischte Runde");
  });
});

describe("Übersicht", () => {
  it("Als Nächstes: zuletzt geübtes Thema, solange dort etwas offen ist", () => {
    const S = blank(); S.last = "T05";
    expect(nextTopic(S).id).toBe("T05");
    expect(nextTopic(blank()).prio).toBe("Muss");
  });
  it("Thema öffnen: neu → Theorie, angefangen → Fragen", () => {
    const S = blank(); expect(startTab(S, "T01")).toBe("theorie");
    S.q[T01[0].id] = { s: 1 }; expect(startTab(S, "T01")).toBe("fragen");
  });
  it("Fragen pro Tag: rot/neu doppelt, gelb einfach", () => {
    expect(perDay(blank(), 11)).toBe(Math.ceil((allQ(blank()).length * 2) / 10));
  });
});

describe("Lernplan", () => {
  const from = "2026-11-13", exam = "2026-11-25"; // Freitag bis Mittwoch der Folgewoche
  const P = buildPlan(blank(), from, exam);
  it("verteilt alle offenen Fragen auf die Lerntage (ohne Sonntag und letzten Tag)", () => {
    expect(P.total).toBe(allQ(blank()).length);
    const sum = Object.values(P.plan).flat().reduce((a, it) => a + (it.kind === "topic" ? it.n : 0), 0);
    expect(sum).toBe(P.total);
    P.days.filter((d) => wdOf(d) === 0).forEach((d) => expect(P.plan[d].map((x) => x.kind)).toEqual(["sim"]));
    expect(P.plan[P.days[P.days.length - 1]]).toEqual([{ kind: "final" }]);
  });
  it("Teil 1 zuerst", () => {
    const first = P.plan[from].find((x) => x.kind === "topic");
    expect(first && first.kind === "topic" && TP[first.tid].teil).toBe("Teil 1");
  });
  it("Mittwochs Operator-Trainer, nach der Prüfung leer", () => {
    expect(P.plan["2026-11-18"].some((x) => x.kind === "op")).toBe(true);
    expect(buildPlan(blank(), exam, exam).days).toEqual([]);
  });
});
