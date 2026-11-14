/** Vortex (kostenlos): Brücken-Text und Ergebnis-Block als Fremdtext – nur bekannte IDs, doppelt einfügen zählt einmal. */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { kbIds, makeKb, paketeOf } from "./tutor-kb";
import { EPOCH, addEvidence, emptyTutor, fvActive } from "./tutor-state";
import { BRIDGE_TAG, bridgePrompt, parseBridge } from "./vortex-bridge";

const kb = makeKb(TAP2), ids = kbIds(kb), topicOf = (k: string) => kb.topicOf.get(k.split(".")[0]);
const T = "T03", K1 = `${paketeOf(kb, T)[0]}.1`, K2 = `${paketeOf(kb, T)[0]}.2`, FREMD = `${paketeOf(kb, "T02")[0]}.1`;
const block = (o: Record<string, unknown> = {}) => "Gut gemacht!\n```" + BRIDGE_TAG + "\n" + JSON.stringify({
  version: 2, thema: T,
  aufgaben: [{ id: "A1", titel: "2NF erläutern", operator: "erläutern", punkte: 3, max: 4, konzepte: [K1, FREMD, "P999.1"], sicherheit: "sicher" }, { titel: "Schlüssel", punkte: 1, max: 4, konzepte: [K2], sicherheit: "ziemlich sicher" }, { titel: "kaputt", punkte: "viel" }],
  graph: [{ konzept: K1, art: "beleg", staerke: 0.5, notiz: "FA erkannt", fehlvorstellung: "", fehl_id: "" }, { konzept: K2, art: "fehlvorstellung", staerke: -0.5, notiz: "", fehlvorstellung: "2NF = keine Wiederholungsgruppen", fehl_id: "" }, { konzept: FREMD, art: "beleg", staerke: 1 }],
  fazit: "Weiter so.", ...o,
}) + "\n```\nViel Erfolg!";

describe("Brücken-Text", () => {
  it("enthält Prüfer-Anweisungen, Ergebnis-Format und die Übergabe – ohne Bezug auf eine erste Nachricht", () => {
    const p = bridgePrompt("Neue Sitzung … Thema: T03\nGehe kurz auf meine erste Nachricht unten ein (Begrüßung höchstens ein Satz) und stelle dann die erste Aufgabe.");
    expect(p).toContain("Operator"); expect(p).toContain("```" + BRIDGE_TAG); expect(p).toContain("Thema: T03");
    expect(p).toContain("Beginne jetzt: ein Satz zur Begrüßung, dann die erste Aufgabe."); expect(p).not.toContain("erste Nachricht unten");
  });
});

describe("parseBridge", () => {
  it("bewertete Aufgaben und Graph-Updates, nur Konzepte des Themas; Kaputtes wird gezählt", () => {
    const r = parseBridge(block(), ids, topicOf, EPOCH + 10);
    expect(r.thema).toBe(T); expect(r.fazit).toBe("Weiter so.");
    expect(r.tasks.map((x) => [x.titel, x.operator, x.punkte, x.max, x.konzepte, x.sich])).toEqual([["2NF erläutern", "Erläutern", 3, 4, [K1], 3], ["Schlüssel", undefined, 1, 4, [K2], 2]]);
    expect(r.skipped).toBe(2); // kaputte Aufgabe + fremdes Konzept im Graph
    expect(r.evidence.filter((e) => e.art === "bewertung").map((e) => [e.k, e.w])).toEqual([[K1, 0.75], [K2, 0.25]]);
  });
  it("sicher, aber falsch → Fehlvorstellung; Fehlvorstellung aus dem Graph mit Kennung aus dem Text", () => {
    const r = parseBridge(block(), ids, topicOf, EPOCH + 10);
    const fv = r.evidence.filter((e) => e.art === "fehlvorstellung");
    expect(fv.map((e) => e.n)).toEqual(["Sicher, aber falsch: Schlüssel", "2NF = keine Wiederholungsgruppen"]);
    expect(fv[1].f).toBe("fv-2nf-keine-wiederholungsgruppen");
    const s = addEvidence(emptyTutor(), r.evidence);
    expect(Object.values(s.fv).every(fvActive)).toBe(true);
  });
  it("zweimal einfügen ergibt dieselben IDs (zählt nur einmal), ein anderer Block andere", () => {
    const a = parseBridge(block(), ids, topicOf, EPOCH + 10), b = parseBridge("```" + BRIDGE_TAG + block().split("```" + BRIDGE_TAG)[1], ids, topicOf, EPOCH + 99);
    expect(b.evidence.map((e) => e.id)).toEqual(a.evidence.map((e) => e.id));
    const s = addEvidence(addEvidence(emptyTutor(), a.evidence), b.evidence);
    expect(s.ev.length).toBe(a.evidence.length);
    expect(parseBridge(block({ fazit: "anders" }), ids, topicOf, EPOCH).hash).not.toBe(a.hash);
  });
  it("verständliche Fehler bei fehlendem Block, falscher Version oder unbekanntem Thema", () => {
    expect(() => parseBridge("Hallo", ids, topicOf, EPOCH)).toThrow(/Kein gültiger Ergebnis-Block/);
    expect(() => parseBridge(block({ version: 1 }), ids, topicOf, EPOCH)).toThrow(/unbekanntes Format/);
    expect(() => parseBridge(block({ thema: "T99" }), ids, topicOf, EPOCH)).toThrow(/Unbekanntes Thema/);
    expect(() => parseBridge("x".repeat(60001), ids, topicOf, EPOCH)).toThrow(/zu lang/);
  });
});
