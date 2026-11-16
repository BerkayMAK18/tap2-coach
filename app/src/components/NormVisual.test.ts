/** NormVisual: an jeder Stelle mit Beispiel erscheint die Darstellung, sonst bleibt alles wie bisher. */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NORM } from "@/lib/normalisierung";
import { NormVisual, TextMitTabellen } from "./NormVisual";

const html = (id: string | null, child?: string) => renderToStaticMarkup(createElement(NormVisual, { id }, child ? createElement("pre", null, child) : undefined));

describe("NormVisual", () => {
  it("ohne Beispiel: nur die bisherige Darstellung", () => {
    expect(html("m0", "Text")).toBe("<pre>Text</pre>");
    expect(html(null)).toBe("");
  });
  it("jede Referenz zeigt Stufen, Tabellen und Schlüssel; Text-Reiter nur mit bisheriger Darstellung", () => {
    NORM.forEach((b) => b.refs.forEach((ref) => {
      const h = html(ref, "Musterlösung als Text");
      expect(h, ref).toContain('class="cv nf"');
      expect(h, ref).toContain(b.stufen[0].tabellen[0].name);
      expect(h, ref).toContain('class="nf-k pk"');
      expect(h, ref).toContain(">Musterlösung<");
      expect(h, ref).not.toContain("Musterlösung als Text"); // erst im Reiter „Musterlösung“
      if (b.stufen.length > 1) expect(h, ref).toContain("Nächste Stufe");
      if (b.abh.length) expect(h, ref).toContain(">Abhängigkeiten<");
      expect(html(ref), ref).not.toContain(">Musterlösung<");
    }));
  });
  it("markiert nicht atomare Spalten in der Ausgangstabelle", () => {
    expect(html("D2")).toContain("nicht atomar");
  });
});

describe("TextMitTabellen", () => {
  const t = (text: string) => renderToStaticMarkup(createElement(TextMitTabellen, { text, className: "qtext" }));
  it("Text ohne Tabelle bleibt unverändert", () => expect(t("a\nb")).toBe('<div class="qtext">a\nb</div>'));
  it("„|“-Zeilen werden zur Tabelle, Inhalte bleiben Text (kein HTML)", () => {
    const h = t("Vorher:\nA | B\n<b>1</b> | 2\nNachher");
    expect(h).toContain('<th scope="col">A</th>');
    expect(h).toContain("<td>&lt;b&gt;1&lt;/b&gt;</td>");
    expect(h).toContain("Vorher:");
    expect(h).toContain("Nachher");
  });
});
