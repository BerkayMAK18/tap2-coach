import { describe, expect, it } from "vitest";
import { BLOCK_INSTRUCTIONS, parseStand, parseTask, stripBlocks } from "./tutor-blocks";

const known = new Set(["T05", "T02"]);
const task = (o: unknown) => "Hier deine Aufgabe.\n\n```tap2-aufgabe\n" + JSON.stringify(o) + "\n```\nViel Erfolg!";

describe("Tutor-Blöcke", () => {
  it("Aufgabe: letzter gültiger Block, unbekanntes Thema wird entfernt", () => {
    expect(parseTask(task({ thema: "T05", titel: "LEFT JOIN", operator: "Erläutern", punkte: 4, text: "Erläutern Sie …" }), known)).toMatchObject({ thema: "T05", titel: "LEFT JOIN", punkte: 4 });
    expect(parseTask(task({ thema: "T99", titel: "X", text: "Y" }), known)).toMatchObject({ thema: undefined, titel: "X" });
    const two = task({ titel: "Alt", text: "a" }) + task({ titel: "Neu", text: "b" });
    expect(parseTask(two, known)?.titel).toBe("Neu");
  });
  it("Aufgabe: kaputt oder unvollständig → keine Aufgabe", () => {
    expect(parseTask("```tap2-aufgabe\n{kein json\n```", known)).toBeNull();
    expect(parseTask(task({ titel: "ohne Text" }), known)).toBeNull();
    expect(parseTask(task({ titel: "x".repeat(200), text: "y" }), known)).toBeNull();
    expect(parseTask("nur Text", known)).toBeNull();
  });
  it("Lernstand: nur bekannte Themen und gültige Stufen", () => {
    const t = "```tap2-stand\n" + JSON.stringify({ themen: [{ thema: "T05", stufe: "schwach", notiz: "JOIN-Arten verwechselt" }, { thema: "T99", stufe: "stark" }] }) + "\n```";
    expect(parseStand(t, known)).toEqual({ T05: { stufe: "schwach", notiz: "JOIN-Arten verwechselt", at: expect.any(String) } });
    expect(parseStand("```tap2-stand\n{\"themen\":[{\"thema\":\"T05\",\"stufe\":\"super\"}]}\n```", known)).toEqual({});
  });
  it("Chattext ohne Aufgaben- und Stand-Blöcke; Ergebnis-Block bleibt", () => {
    const t = task({ titel: "A", text: "B" }) + "\n```tap2-stand\n{\"themen\":[]}\n```\n```tap2-ergebnis\n{}\n```";
    const s = stripBlocks(t);
    expect(s).not.toContain("tap2-aufgabe"); expect(s).not.toContain("tap2-stand"); expect(s).toContain("tap2-ergebnis");
    expect(s.startsWith("Hier deine Aufgabe.")).toBe(true);
  });
  it("Anweisungen nennen beide Blöcke", () => {
    expect(BLOCK_INSTRUCTIONS).toContain("```tap2-aufgabe"); expect(BLOCK_INSTRUCTIONS).toContain("```tap2-stand");
  });
});
