import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { kbDetail, kbIds, kbOverview, makeKb, paketeOf } from "./tutor-kb";
import { TOOLS, TOOL_NAMES, answerResult, applyTool, emptyPfad, asText, feedOf, handoff, phaseOf, processReply, tooLong, tutorPct, type ApiMsg, type Pfad, type ToolUse } from "./tutor-protocol";

const kb = makeKb(TAP2), ids = kbIds(kb);
const T = kb.topics[0].id, P = paketeOf(kb, T)[0], T2 = kb.topics[1].id, P2 = paketeOf(kb, T2)[0];
const tu = (name: string, input: unknown, id = "tu_" + name): ToolUse => ({ type: "tool_use", id, name, input });

describe("Wissensbasis", () => {
  it("IDs bis zur Kernaussage, Überblick und Details aus dem Katalog", () => {
    expect(ids.topics.has(T) && ids.pakete.has(P) && ids.kern.has(P + ".1")).toBe(true);
    expect(ids.kern.size).toBe(TAP2.pakete.reduce((a, p) => a + p.kern.length, 0));
    const ov = kbOverview(kb);
    expect(ov).toContain(`## ${T} · `); expect(ov).toContain(`${P}.1 `);
    expect(ov.length).toBeLessThan(12000);
    const d = kbDetail(kb, [P, P, "P999"]);
    expect(d.match(new RegExp(`## ${P} `, "g"))?.length).toBe(1);
    expect(d).not.toContain("P999");
  });
});

describe("Tutor-Werkzeuge", () => {
  it("Werkzeugliste mit Schemas", () => {
    expect(TOOL_NAMES).toEqual(["stand_festhalten", "lehrplan_setzen", "frage_stellen", "antwort_bewerten", "schritt_abschliessen"]);
    TOOLS.forEach((t) => expect(t.input_schema.type).toBe("object"));
  });
  it("Diagnose: Stand je Thema, unbekannte Themen als Fehler zurück, Phase wechselt erst mit diagnose_fertig", () => {
    let a = applyTool(emptyPfad(), tu("stand_festhalten", { themen: [{ thema: T, stufe: "schwach", notiz: "x" }, { thema: "T99", stufe: "stark" }] }), ids);
    expect(a.pfad.stand[T]).toMatchObject({ stufe: "schwach", notiz: "x" });
    expect(a.result?.is_error).toBe(true);
    expect(phaseOf(a.pfad)).toBe("stand");
    a = applyTool(a.pfad, tu("stand_festhalten", { themen: [], diagnose_fertig: true }), ids);
    expect(phaseOf(a.pfad)).toBe("plan");
  });
  it("Lehrplan: nur bekannte IDs, erster Schritt aktiv, fertige Schritte bleiben bei neuem Plan fertig", () => {
    expect(applyTool(emptyPfad(), tu("lehrplan_setzen", { ziel: "z", schritte: [{ id: "a", titel: "A", thema: T, pakete: ["P999"], ziel: "x" }] }), ids).result?.is_error).toBe(true);
    let a = applyTool(emptyPfad(), tu("lehrplan_setzen", { ziel: "Reif", schritte: [{ id: "a", titel: "A", thema: T, pakete: [P], ziel: "x" }, { id: "b", titel: "B", thema: T2, pakete: [P2], ziel: "y", nach: ["a", "zz"] }] }), ids);
    expect(a.pfad.plan.map((s) => s.status)).toEqual(["aktiv", "offen"]);
    expect(a.pfad.plan[1].nach).toEqual(["a"]);
    expect(phaseOf(a.pfad)).toBe("lernen");
    a = applyTool(a.pfad, tu("schritt_abschliessen", { schritt: "a", beleg: "erklärt", verstanden: [{ aussage: "kann A", kern: P + ".1" }] }), ids);
    expect(a.pfad.plan.map((s) => s.status)).toEqual(["fertig", "aktiv"]);
    expect(a.pfad.insights[0]).toMatchObject({ thema: T, aussage: "kann A", kern: P + ".1" });
    a = applyTool(a.pfad, tu("lehrplan_setzen", { ziel: "Neu", schritte: [{ id: "a", titel: "A", thema: T, pakete: [P], ziel: "x" }, { id: "c", titel: "C", thema: T2, pakete: [P2], ziel: "z" }] }), ids);
    expect(a.pfad.plan.map((s) => s.status)).toEqual(["fertig", "aktiv"]);
    a = applyTool(a.pfad, tu("schritt_abschliessen", { schritt: "c", beleg: "ok" }), ids);
    expect(phaseOf(a.pfad)).toBe("fertig");
  });
  it("Frage: geprüft, Auswahl braucht Optionen und richtigen Index; Ergebnis kommt erst mit der Antwort", () => {
    const bad = applyTool(emptyPfad(), tu("frage_stellen", { thema: T, art: "auswahl", frage: "?", optionen: ["a", "b", "c"] }), ids);
    expect(bad.result?.is_error).toBe(true);
    const a = applyTool(emptyPfad(), tu("frage_stellen", { thema: T, art: "auswahl", frage: "Was?", optionen: ["a", "b", "c"], richtig: 2, kern: [P + ".1", "P999.1"] }), ids);
    expect(a.result).toBeUndefined();
    expect(a.question).toMatchObject({ art: "auswahl", richtig: 2, kern: [P + ".1"], toolId: "tu_frage_stellen" });
    const r = answerResult(a.question!, { wahl: 1, sicher: "eher", denken: "geraten" });
    expect(r.correct).toBe(false);
    expect(r.result.content).toContain("falsch (richtig ist C)");
    expect(r.result.content).toContain("Meine Gedanken: geraten");
    expect(answerResult(a.question!, { wahl: 2, sicher: "sicher" }).correct).toBe(true);
    const f = applyTool(emptyPfad(), tu("frage_stellen", { thema: T, art: "frei", frage: "Erläutern Sie …", operator: "Erläutern", punkte: 4 }), ids).question!;
    expect(answerResult(f, { text: "Weil …", sicher: "unsicher" }).result.content).toMatch(/^Meine Antwort: Weil …\nSicherheit: unsicher\./);
  });
  it("Bewertung: Beleg mit Punkten (gekappt), Fehlvorstellung gemerkt, Tutor-Reife je Thema", () => {
    let p: Pfad = emptyPfad();
    let a = applyTool(p, tu("antwort_bewerten", { thema: T, punkte: 6, max: 4, fehlvorstellung: "verwechselt X" }), ids, "a");
    expect(a.graded).toEqual({ thema: T, punkte: 4, max: 4 });
    expect(a.pfad.evidence[0]).toMatchObject({ thema: T, schritt: "a", punkte: 4, max: 4, art: "frei" });
    expect(a.pfad.miscon[0].aussage).toBe("verwechselt X");
    p = a.pfad; a = applyTool(p, tu("antwort_bewerten", { thema: T, punkte: 0, max: 4 }), ids);
    expect(tutorPct(a.pfad, T)).toBeCloseTo(1 / 3); // neuere Antwort zählt doppelt
    expect(tutorPct(a.pfad, T2)).toBeNull();
    expect(applyTool(p, tu("antwort_bewerten", { thema: "T99", punkte: 1, max: 2 }), ids).result?.is_error).toBe(true);
  });
  it("Unbekanntes Werkzeug → Fehler an den Tutor", () => {
    expect(applyTool(emptyPfad(), tu("loeschen", {}), ids).result).toMatchObject({ is_error: true });
  });
});

describe("Verlauf und Übergabe", () => {
  it("Antwort verarbeiten: eine offene Frage, weitere als Fehler; Werkzeug-Ergebnisse für die nächste Nachricht", () => {
    const q = (id: string) => tu("frage_stellen", { thema: T, art: "auswahl", frage: "?", optionen: ["a", "b", "c"], richtig: 0, schritt: "a" }, id);
    const content = [{ type: "thinking", thinking: "…", signature: "s" }, { type: "text", text: "Los." }, tu("stand_festhalten", { themen: [{ thema: T, stufe: "schwach" }] }), q("q1"), q("q2")];
    const r = processReply(emptyPfad(), content, ids);
    expect(r.question?.toolId).toBe("q1"); expect(r.schritt).toBe("a");
    expect(r.results.map((x) => [x.tool_use_id, !!x.is_error])).toEqual([["tu_stand_festhalten", false], ["q2", true]]);
    expect(r.pfad.stand[T].stufe).toBe("schwach");
  });
  it("Zu langer Verlauf → Übergabe; Nutzerblöcke als Text", () => {
    const msgs: ApiMsg[] = Array.from({ length: 101 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "m" + i }));
    expect(tooLong(msgs)).toBe(true); expect(tooLong(msgs.slice(0, 10))).toBe(false);
    expect(asText([{ type: "tool_result", tool_use_id: "x", content: "Ich wähle A" }, { type: "text", text: "und?" }])).toBe("Ich wähle A\n\nund?");
  });
  it("Anzeige: Start, Tutor-Text, Frage mit Antwort, Plan, Bewertung; Denk-Blöcke und ungültige Werkzeuge nicht", () => {
    const plan = tu("lehrplan_setzen", { ziel: "Reif", schritte: [{ id: "a", titel: "A", thema: T, pakete: [P], ziel: "x" }] }, "p1");
    const fr = tu("frage_stellen", { thema: T, art: "frei", frage: "Erläutern Sie …", punkte: 4 }, "f1");
    const msgs: ApiMsg[] = [
      { role: "user", content: "Übergabe aus dem TAP2-Coach …" },
      { role: "assistant", content: [{ type: "thinking", thinking: "geheim", signature: "s" }, { type: "text", text: "Hallo" }, plan, fr, tu("antwort_bewerten", { thema: "T99", punkte: 1, max: 2 }, "b0")] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "p1", content: "Lehrplan gespeichert" }, { type: "tool_result", tool_use_id: "f1", content: "Meine Antwort: …" }, { type: "tool_result", tool_use_id: "b0", content: "Ungültige Bewertung.", is_error: true }] },
      { role: "assistant", content: [tu("antwort_bewerten", { thema: T, punkte: 3, max: 4 }, "b1"), { type: "text", text: "Gut." }] },
    ];
    expect(feedOf(msgs, ids).map((f) => f.k)).toEqual(["start", "tutor", "plan", "frage", "bewertung", "tutor"]);
    expect(feedOf(msgs, ids)[3]).toMatchObject({ k: "frage", antwort: "Meine Antwort: …" });
  });
  it("Übergabe nennt Lernstand, Plan und nächsten Schritt", () => {
    const pfad = applyTool(emptyPfad(), tu("lehrplan_setzen", { ziel: "Reif", schritte: [{ id: "a", titel: "A", thema: T, pakete: [P], ziel: "x" }] }), ids).pfad;
    const h = handoff({ examDays: 11, topics: [{ id: T, name: "Algo", muss: true, pct: 0.2, level: "schwach", rot: 3, neu: 5, tutor: 0.5 }], errors: [], pfad });
    expect(h).toContain("Prüfung in 11 Tagen"); expect(h).toContain(`${T} · Algo · Pflicht · 20 %`); expect(h).toContain("Tutor 50 %");
    expect(h).toContain("[aktiv] a · A"); expect(h).toContain("Mach mit dem aktiven Schritt weiter");
    expect(handoff({ examDays: 1, topics: [], errors: [], pfad: emptyPfad() })).toContain("Beginne mit der Diagnose.");
  });
});
