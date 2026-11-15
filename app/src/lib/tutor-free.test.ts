/**
 * Kostenloser Tutor: Umwandlung zwischen dem Blockformat der App (wie Claude) und dem OpenAI-Format des Gratis-Anbieters.
 * Die Funktionen stehen in der Edge Function (Abschnitt CONVERT); der Test löst sie heraus und übersetzt sie mit TypeScript.
 * Dazu: Die ganze Edge Function ist syntaktisch gültig.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const src = readFileSync(new URL("../../supabase/functions/tutor/index.ts", import.meta.url), "utf8");
const part = src.split("// CONVERT-START")[1].split("// CONVERT-END")[0].replace(/^[^\n]*\n/, "");
const js = ts.transpileModule(part + "\nreturn { toOpenAi, fromOpenAi };", { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
type Fn = { toOpenAi: (s: string, m: unknown[], t: number) => { role: string; content: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[]; tool_call_id?: string }[]; fromOpenAi: (m: unknown, f: string, n: string, seed: string) => { content: { type: string; [k: string]: unknown }[]; stop: string } };
const { toOpenAi, fromOpenAi } = new Function(js)() as Fn;

describe("Edge Function", () => {
  it("ist syntaktisch gültiges TypeScript", () => {
    const r = ts.transpileModule(src, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    expect(r.diagnostics ?? []).toEqual([]);
  });
});

describe("toOpenAi", () => {
  const msgs = [
    { role: "user", content: [{ type: "text", text: "Übergabe" }] },
    { role: "assistant", content: [{ type: "thinking", thinking: "" }, { type: "text", text: "Hallo" }, { type: "tool_use", id: "c1", name: "pruefer_runde", input: { nachricht: "A1" } }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "c1", content: "ok" }, { type: "text", text: "Antwort" }] },
  ];
  it("System, Nutzer, Werkzeugaufruf und -ergebnis im OpenAI-Format; Denk-Blöcke fallen weg", () => {
    const o = toOpenAi("SYS", msgs, 10);
    expect(o.map((m) => m.role)).toEqual(["system", "user", "assistant", "tool", "user"]);
    expect(o[2]).toMatchObject({ content: "Hallo", tool_calls: [{ id: "c1", type: "function", function: { name: "pruefer_runde", arguments: '{"nachricht":"A1"}' } }] });
    expect(o[3]).toMatchObject({ tool_call_id: "c1", content: "ok" });
  });
  it("kürzt auf Übergabe + jüngste Nachrichten, ohne mit einer Werkzeug-Antwort zu beginnen", () => {
    const long = [msgs[0], ...Array.from({ length: 6 }, () => [msgs[1], msgs[2]]).flat()];
    const o = toOpenAi("SYS", long, 4);
    expect(o[1]).toMatchObject({ role: "user", content: "Übergabe" });
    expect(o[2].role).not.toBe("tool");
    expect(o.length).toBeLessThanOrEqual(1 + 1 + 4);
  });
});

describe("fromOpenAi", () => {
  it("Werkzeugaufruf → tool_use mit geprüfter ID, Text bleibt", () => {
    const r = fromOpenAi({ content: "Los", tool_calls: [{ id: "call_abc", function: { name: "pruefer_runde", arguments: '{"nachricht":"x","phase":"aufgabe"}' } }] }, "tool_calls", "pruefer_runde", "s");
    expect(r.stop).toBe("tool_use");
    expect(r.content).toEqual([{ type: "text", text: "Los" }, { type: "tool_use", id: "call_abc", name: "pruefer_runde", input: { nachricht: "x", phase: "aufgabe" } }]);
  });
  it("fremde Werkzeuge werden ignoriert, kaputte IDs ersetzt, kaputtes JSON → leere Eingabe", () => {
    const r = fromOpenAi({ content: "", tool_calls: [{ id: "bad id!", function: { name: "pruefer_runde", arguments: "{kaputt" } }, { id: "x", function: { name: "rm_rf", arguments: "{}" } }] }, "tool_calls", "pruefer_runde", "s");
    expect(r.content).toEqual([{ type: "tool_use", id: "call_s_0", name: "pruefer_runde", input: {} }]);
  });
  it("JSON im Text (Modell ohne echten Werkzeugaufruf) wird als Aufruf gedeutet", () => {
    const r = fromOpenAi({ content: '```json\n{"nachricht":"Hallo","phase":"antwort"}\n```' }, "stop", "pruefer_runde", "s");
    expect(r.stop).toBe("tool_use"); expect(r.content).toEqual([{ type: "tool_use", id: "call_s_0", name: "pruefer_runde", input: { nachricht: "Hallo", phase: "antwort" } }]);
  });
  it("nur Text → Chat-Antwort; leere Antwort → Platzhalter", () => {
    expect(fromOpenAi({ content: "Nur Text" }, "stop", "pruefer_runde", "s")).toEqual({ content: [{ type: "text", text: "Nur Text" }], stop: "end_turn" });
    expect(fromOpenAi({ content: null }, "length", "pruefer_runde", "s").stop).toBe("max_tokens");
  });
});
