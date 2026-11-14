/** Prüfer-Tutor: Runden verarbeiten – Aufgaben, Bewertung wie ein Prüfer, Belege, „sicher aber falsch“, Nachrichten. */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { kbIds, makeKb, paketeOf } from "./tutor-kb";
import { applyReply, chunks, costOf, feedOf, handoff, newConvo, userMsg, userText, type Block, type Convo } from "./tutor-session";

const kb = makeKb(TAP2), ids = kbIds(kb), topicOf = (k: string) => kb.topicOf.get(k.split(".")[0]);
const T = "T03", P = paketeOf(kb, T)[0], K1 = `${P}.1`, K2 = `${P}.2`;
const auf = (id: string, punkte = 4) => ({ id, titel: "Titel " + id, operator: "Erläutern", punkte, stellung: "Erläutern Sie …", konzepte: [K1, K2], material: [], erwartung: [{ aspekt: "a", punkte }] });
const toolUse = (input: unknown, id = "toolu_" + Math.random().toString(36).slice(2, 10)): Block[] => [{ type: "thinking", thinking: "", signature: "sig" }, { type: "tool_use", id, name: "pruefer_runde", input }];
const bew = (aufgabe: string, punkte: number, max = 4) => ({ aufgabe, punkte, max, teile: [{ aspekt: "a", punkte, max, begruendung: "weil" }], fehlt: "die Begründung", operator_erfuellt: true });
const step = (c: Convo, input: unknown, sich?: 0 | 1 | 2 | 3) => applyReply({ ...c, msgs: [...c.msgs, userMsg(c, [{ type: "text", text: "x" }])], ui: { ...c.ui, [c.msgs.length]: { kind: c.msgs.length ? "antwort" : "start", text: "x" } } }, toolUse(input), ids, topicOf, 1000, sich);

describe("applyReply", () => {
  const c0 = newConvo("s1", T, "sonnet", 0);
  it("neue Aufgabe wird offen, tool_result „ok“ geht mit der nächsten Nachricht zurück; Denk-Blöcke bleiben unverändert", () => {
    const r = step(c0, { nachricht: "Los.", phase: "aufgabe", aufgabe: auf("A1") });
    expect(r.convo.offen).toBe("A1"); expect(r.convo.pending).toMatchObject({ type: "tool_result", content: "ok" });
    expect(r.convo.msgs[1].content[0]).toEqual({ type: "thinking", thinking: "", signature: "sig" });
    expect(userMsg(r.convo, [{ type: "text", text: "Antwort" }]).content[0]).toMatchObject({ type: "tool_result", tool_use_id: r.convo.pending!.tool_use_id });
  });
  it("Bewertung: je geprüftem Konzept ein Beleg, nur die erste Bewertung zählt für XP, Höchstpunkte aus der Aufgabe", () => {
    let c = step(c0, { nachricht: "Los.", phase: "aufgabe", aufgabe: auf("A1") }).convo;
    const r = step(c, { nachricht: "3 von 4.", phase: "bewertung", bewertung: bew("A1", 3, 9) }, 3);
    expect(r.graded).toMatchObject({ key: "A1", punkte: 3, max: 4, first: true, sich: 3 });
    expect(r.evidence.map((e) => [e.k, e.art, e.w])).toEqual([[K1, "bewertung", 0.75], [K2, "bewertung", 0.75]]);
    expect(r.convo.offen).toBeUndefined();
    c = r.convo;
    expect(step(c, { nachricht: "Nachbewertet.", phase: "bewertung", bewertung: bew("A1", 4) }).graded?.first).toBe(false);
  });
  it("sicher, aber falsch → Fehlvorstellung (auch ohne Meldung des Tutors); unsicher und falsch → nicht", () => {
    const c = step(c0, { nachricht: "Los.", phase: "aufgabe", aufgabe: auf("A1") }).convo;
    const r = step(c, { nachricht: "1 von 4.", phase: "bewertung", bewertung: bew("A1", 1) }, 2);
    expect(r.evidence.filter((e) => e.art === "fehlvorstellung").length).toBe(2);
    expect(r.evidence.find((e) => e.art === "fehlvorstellung")?.n).toBe("Sicher, aber falsch: die Begründung");
    expect(step(c, { nachricht: "1 von 4.", phase: "bewertung", bewertung: bew("A1", 1) }, 1).evidence.some((e) => e.art === "fehlvorstellung")).toBe(false);
    // Meldet der Tutor selbst eine Fehlvorstellung, wird keine zweite erzeugt
    const own = step(c, { nachricht: "x", phase: "bewertung", bewertung: bew("A1", 1), graph: [{ konzept: K1, art: "fehlvorstellung", staerke: -0.6, notiz: "", fehlvorstellung: "verwechselt 2NF und 3NF", fehl_id: "" }] }, 3);
    expect(own.evidence.filter((e) => e.art === "fehlvorstellung").map((e) => e.f)).toEqual(["fv-verwechselt-2nf-und-3nf"]);
  });
  it("Bewertung und neue Aufgabe in einer Runde; wiederverwendete Aufgaben-ID bekommt einen eigenen Schlüssel", () => {
    let c = step(c0, { nachricht: "Los.", phase: "aufgabe", aufgabe: auf("A1") }).convo;
    c = step(c, { nachricht: "Gut, weiter.", phase: "bewertung", bewertung: bew("A1", 4), aufgabe: auf("A1", 6) }).convo;
    expect(c.order).toEqual(["A1", "A1~2"]); expect(c.offen).toBe("A1~2"); expect(c.bewertungen.A1.b.punkte).toBe(4);
    const r = step(c, { nachricht: "x", phase: "bewertung", bewertung: bew("A1", 3, 6) });
    expect(r.graded).toMatchObject({ key: "A1~2", max: 6, first: true });
    const feed = feedOf(r.convo, ids).map((f) => f.k);
    expect(feed).toEqual(["start", "tutor", "aufgabe", "me", "bewertung", "tutor", "aufgabe", "me", "bewertung", "tutor"]);
  });
  it("ungültige Teile gehen als Hinweis an den Tutor zurück; ohne gültige Nachricht als Fehler", () => {
    const r = step(c0, { nachricht: "x", graph: [{ konzept: "P999.1", art: "beleg", staerke: 1, notiz: "", fehlvorstellung: "", fehl_id: "" }] });
    expect(r.convo.pending?.content).toMatch(/^Hinweise zur letzten Runde: graph\[0\]: unbekanntes Konzept/); expect(r.convo.pending?.is_error).toBeUndefined();
    expect(step(c0, { phase: "aufgabe" }).convo.pending?.is_error).toBe(true);
    expect(step(c0, { nachricht: "x", bewertung: bew("A9", 2) }).convo.pending?.content).toContain("unbekannte Aufgabe A9");
  });
  it("ohne Werkzeugaufruf: Text als Chat, kein tool_result offen", () => {
    const r = applyReply(c0, [{ type: "text", text: "Nur Text." }], ids, topicOf, 1);
    expect(r.text).toBe("Nur Text."); expect(r.convo.pending).toBeUndefined(); expect(r.evidence).toEqual([]);
  });
});

describe("Nachrichten", () => {
  it("Antwort mit Gedankengang und Sicherheit klar getrennt; Schlauch verlangt Teilschritt statt Lösung", () => {
    const a = { ...auf("A1"), operator: "Erläutern" as const };
    const t = userText({ kind: "antwort", text: "Meine Antwort", gedanke: "weil X", sich: 2 }, a);
    expect(t).toContain("zur offenen Aufgabe A1"); expect(t).toContain('"""\nMeine Antwort\n"""');
    expect(t).toContain("Gedankengang (Hilfe für dich, nicht Teil der Antwort): weil X"); expect(t).toContain("Sicherheit: ziemlich sicher");
    expect(userText({ kind: "schlauch" }, a)).toContain("kleineren Teilschritt oder ein Gerüst – nicht die Lösung");
  });
  it("lange Übergabe in Blöcke ≤ 7500 Zeichen (Server-Grenze 8000)", () => {
    const text = Array.from({ length: 400 }, (_, i) => `Zeile ${i} ` + "x".repeat(60)).join("\n") + "\n" + "y".repeat(9000);
    const b = chunks(text);
    expect(b.every((x) => x.text.length <= 7500)).toBe(true); expect(b.map((x) => x.text).join("").replace(/\n/g, "")).toBe(text.replace(/\n/g, ""));
  });
  it("Übergabe nennt Thema, Stand je Konzept, Fehlvorstellungen mit fehl_id und die Inhalte", () => {
    const h = handoff({ date: "Sa, 14.11.", examDays: 11, topic: { id: T, name: "Datenmodell", muss: true }, concepts: [{ id: K1, label: "FA", m: 0.4, n: 2 }, { id: K2, label: "2NF", m: null, n: 0 }], miscon: [{ id: "fv-a", konzept: K2, text: "2NF heißt atomar", count: 2 }], errors: [], sessions: { n: 0 }, fokus: [K2], inhalte: "# Inhalte" });
    expect(h).toContain("Thema: T03 · Datenmodell (Muss-Thema). Prüfung in 11 Tagen.");
    expect(h).toContain(`- ${K1} · FA · 40 % · 2`); expect(h).toContain(`- ${K2} · 2NF · offen · 0`); expect(h).toContain("fehl_id fv-a");
  });
  it("Kosten: Sonnet mit Cache (1 Std. schreiben = 2×, lesen = 0,10 $/Mio.)", () => {
    expect(costOf("sonnet", { input_tokens: 1000, output_tokens: 1000, cache_read_input_tokens: 100_000, cache_creation: { ephemeral_1h_input_tokens: 10_000 } })).toBeCloseTo((1000 * 2 + 20_000 * 2 + 100_000 * 0.1 + 1000 * 10) / 1e6, 8);
  });
});
