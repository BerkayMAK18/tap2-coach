/**
 * Gleichlauf Server ↔ App: Das Werkzeug „pruefer_runde“ legt allein die Edge Function fest. Dieser Test liest das
 * JSON-Schema aus supabase/functions/tutor/index.ts und prüft es gegen das Zod-Schema der App und die Regeln für strenge
 * Werkzeuge (strict: alle Objekte additionalProperties false, keine Längen-/Zahlengrenzen im Schema).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { kbIds, makeKb, paketeOf } from "./tutor-kb";
import { GRAPH_ARTEN, OPERATOR_LIST, PHASEN, SPRACHEN, TOOL_NAME, parseRunde } from "./tutor-schema";

const src = readFileSync(new URL("../../supabase/functions/tutor/index.ts", import.meta.url), "utf8");
const json = src.split("// TOOL-START")[1].split("// TOOL-END")[0].replace(/^[^\n]*\n/, "").replace(/^const TOOL = /m, "").replace(/;\s*$/, "");
type S = { type?: string; properties?: Record<string, S>; required?: string[]; items?: S; anyOf?: S[]; enum?: string[]; const?: string; additionalProperties?: boolean; [k: string]: unknown };
const TOOL = JSON.parse(json) as { name: string; strict: boolean; input_schema: S };
const P = TOOL.input_schema.properties!;

function walk(s: S, f: (s: S, path: string) => void, path = "") { f(s, path); Object.entries(s.properties ?? {}).forEach(([k, v]) => walk(v, f, `${path}.${k}`)); if (s.items) walk(s.items, f, path + "[]"); (s.anyOf ?? []).forEach((v, i) => walk(v, f, `${path}|${i}`)); }

describe("Werkzeug der Edge Function", () => {
  it("Name, strict und feste Anweisungen auf dem Server", () => {
    expect(TOOL.name).toBe(TOOL_NAME); expect(TOOL.strict).toBe(true);
    expect(src).toContain("tools: [TOOL]");
    expect(src).toMatch(/body\.system !== undefined \|\| body\.tools !== undefined/); // Client darf nichts einschleusen
    expect(src).toContain('tool_choice: { type: "auto", disable_parallel_tool_use: true }');
    for (const w of ["Gedankengang", "Sicherheit", "Schlauch", "Operator", "Erwartungshorizont"]) expect(src).toContain(w);
  });
  it("strenges Schema: Objekte geschlossen, required nur bekannte Felder, keine nicht unterstützten Grenzen", () => {
    walk(TOOL.input_schema, (s, path) => {
      if (s.type === "object") { expect(s.additionalProperties, path).toBe(false); (s.required ?? []).forEach((r) => expect(Object.keys(s.properties ?? {}), path).toContain(r)); }
      for (const k of ["minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "multipleOf", "pattern"]) expect(s[k], `${path} ${k}`).toBeUndefined();
    });
  });
  it("Aufzählungen wie in der App", () => {
    expect(P.phase.enum).toEqual([...PHASEN]);
    expect(P.aufgabe.properties!.operator.enum).toEqual(OPERATOR_LIST);
    expect(P.graph.items!.properties!.art.enum).toEqual([...GRAPH_ARTEN]);
    const mat = P.aufgabe.properties!.material.items!.anyOf!;
    expect(mat.map((m) => m.properties!.art.const)).toEqual(["tabelle", "code", "regeln", "text"]);
    expect(mat[1].properties!.sprache.enum).toEqual([...SPRACHEN]);
  });
  it("eine Eingabe genau nach dem Server-Schema (alle Pflichtfelder) besteht die Prüfung der App ohne Hinweise", () => {
    const kb = makeKb(TAP2), ids = kbIds(kb), k = `${paketeOf(kb, "T02")[0]}.1`;
    const input = {
      nachricht: "Weiter.", phase: "bewertung",
      aufgabe: { id: "A2", titel: "Join", operator: "Entwickeln", punkte: 6, stellung: "Entwickeln Sie …", konzepte: [k], material: [{ art: "tabelle", titel: "", kopf: ["a"], zeilen: [["1"]] }], erwartung: [{ aspekt: "a", punkte: 6 }] },
      bewertung: { aufgabe: "A1", punkte: 2.5, max: 4, teile: [{ aspekt: "a", punkte: 2.5, max: 4, begruendung: "b" }], fehlt: "", operator_erfuellt: true },
      graph: [{ konzept: k, art: "beleg", staerke: 0.3, notiz: "n", fehlvorstellung: "", fehl_id: "" }],
      abschluss: { fazit: "f", naechstes: "" },
    };
    // Felder der Eingabe = Felder des Schemas (in beide Richtungen)
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(input)).toEqual(keys(P));
    expect(keys(input.aufgabe)).toEqual(keys(P.aufgabe.properties!));
    expect(keys(input.bewertung)).toEqual(keys(P.bewertung.properties!));
    expect(keys(input.graph[0])).toEqual(keys(P.graph.items!.properties!));
    const r = parseRunde(input, ids);
    expect(r.probleme).toEqual([]); expect(r.runde?.aufgabe?.id).toBe("A2"); expect(r.runde?.graph.length).toBe(1);
  });
});
