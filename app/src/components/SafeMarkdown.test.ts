/** SafeMarkdown darf aus KI-Text nie HTML erzeugen. */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SafeMarkdown } from "./SafeMarkdown";

const html = (t: string) => renderToStaticMarkup(createElement(SafeMarkdown, { text: t }));
describe("SafeMarkdown", () => {
  it("stellt fett, Code und Listen dar", () => {
    const h = html("**Frage 1**\n- `SELECT`\n- *kursiv*\n```sql\nSELECT 1;\n```");
    expect(h).toContain("<strong>Frage 1</strong>");
    expect(h).toContain("<ul");
    expect(h).toContain("<pre");
  });
  it("lässt HTML aus der Antwort nie durch", () => {
    const h = html('<img src=x onerror=alert(1)> **<script>x</script>**');
    expect(h).not.toContain("<img");
    expect(h).not.toContain("<script");
    expect(h).toContain("&lt;img");
  });
});
