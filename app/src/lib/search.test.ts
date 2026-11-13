/** Suche über alle Fragen: gleiche Regeln wie in der Live-App. */
import { describe, expect, it } from "vitest";
import { BASE_Q, TAP2, TOPICS } from "@/content/catalog";
import { buildIndex, hl, norm, qSnippet, search, snippet, tooShort } from "./search";

const idx = buildIndex(BASE_Q, TAP2.ueb, TOPICS, TAP2.pakete);

describe("Normalisieren und Markieren", () => {
  it("ignoriert Groß/klein, Akzente und ß", () => {
    expect(norm("Kündigungsfrist GROSS Straße")).toBe("kundigungsfrist gross strasse");
  });
  it("markiert Treffer an der Originalstelle (auch bei ß → ss)", () => {
    expect(hl("Die Straße", ["strasse"])).toEqual([["Die ", false], ["Straße", true]]);
    expect(hl("Join und LEFT JOIN", ["join"])).toEqual([["Join", true], [" und LEFT ", false], ["JOIN", true]]);
  });
  it("Ausschnitt mit Auslassungszeichen", () => {
    const s = snippet("a".repeat(100) + " Treffer " + "b".repeat(200), ["treffer"], 10);
    expect(s[0]).toEqual(["… ", false]);
    expect(s.find((x) => x[1])?.[0]).toBe("Treffer");
    expect(s[s.length - 1]).toEqual([" …", false]);
    expect(snippet("nichts", ["zzz"], 10)).toEqual([]);
  });
});

describe("Suche", () => {
  it("braucht mindestens zwei Zeichen", () => {
    expect(tooShort("a")).toBe(true);
    expect(tooShort(" a ")).toBe(true);
    expect(tooShort("ab")).toBe(false);
  });
  it("findet Fragen, in denen alle Wörter vorkommen", () => {
    const r = search(idx, "left join");
    expect(r.Q.length).toBeGreaterThan(0);
    r.Q.forEach((x) => expect((x.front + " " + x.back).includes("left") && (x.front + " " + x.back).includes("join")).toBe(true));
  });
  it("Treffer in der Aufgabe stehen vor Treffern nur in der Antwort", () => {
    const r = search(idx, "normalform");
    const firstBack = r.Q.findIndex((x) => !x.front.includes("normalform"));
    const lastFront = r.Q.map((x) => x.task.includes("normalform")).lastIndexOf(true);
    expect(lastFront).toBeGreaterThanOrEqual(0);
    if (firstBack >= 0) expect(lastFront).toBeLessThan(firstBack);
  });
  it("findet Themen und Übungsaufgaben", () => {
    expect(search(idx, "pseudocode").T.map((x) => x.t.id)).toContain("T01");
    expect(search(idx, TAP2.ueb[0].titel).U.map((x) => x.u.id)).toContain(TAP2.ueb[0].id);
  });
  it("Ausschnitt nur, wenn die Aufgabe selbst nicht passt", () => {
    const r = search(idx, "normalform"), x = r.Q.find((h) => !h.task.includes("normalform"));
    if (x) expect(qSnippet(x, r.terms)?.label).toMatch(/Situation|Antworten|Antwort/);
    expect(qSnippet(r.Q[0], r.terms)).toBeNull();
  });
});
