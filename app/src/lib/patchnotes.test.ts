import { describe, expect, it } from "vitest";
import { pnCmp, pnFmt, pnFromApi, pnInline, pnMd, pnParseCache, type Release } from "./patchnotes";

const rel = (tag: string, date: string): Release => ({ tag, date, name: "", url: "", body: "" });

describe("Patch Notes", () => {
  it("API → Releases: Entwürfe raus, Datum aus der ersten Zeile, Name ohne Versionspräfix, nur GitHub-Links", () => {
    const l = pnFromApi([
      { tag_name: "v1.2.0", name: "v1.2.0 – Neue Suche", html_url: "https://github.com/x/y/releases/tag/v1.2.0", published_at: "2026-11-02T10:00:00Z", body: "*Veröffentlicht am 1.11.2026*\n\n- Suche" },
      { tag_name: "v1.3.0", name: "Entwurf", draft: true, body: "" },
      { tag_name: "v1.1.0", name: "", html_url: "javascript:alert(1)", published_at: "2026-10-05T10:00:00Z", body: "Text" },
    ]);
    expect(l).toEqual([
      { tag: "v1.2.0", name: "Neue Suche", url: "https://github.com/x/y/releases/tag/v1.2.0", date: "2026-11-01", body: "- Suche" },
      { tag: "v1.1.0", name: "v1.1.0", url: "https://github.com/BerkayMAK18/tap2-coach/releases", date: "2026-10-05", body: "Text" },
    ]);
    expect(() => pnFromApi({ message: "rate limit" })).toThrow();
  });
  it("neueste zuerst, bei gleichem Datum höhere Version", () => {
    const l = [rel("v1.2.0", "2026-11-01"), rel("v1.10.0", "2026-11-03"), rel("v1.9.0", "2026-11-03")].sort(pnCmp);
    expect(l.map((x) => x.tag)).toEqual(["v1.10.0", "v1.9.0", "v1.2.0"]);
  });
  it("Zwischenspeicher: Format der Live-App, fremde Links und Daten entschärft", () => {
    expect(pnParseCache(null)).toBeNull();
    expect(pnParseCache("kaputt")).toBeNull();
    const c = pnParseCache(JSON.stringify({ at: 5, list: [{ tag: "v1", name: "n", url: "http://evil", date: "<b>", body: 3 }, null] }))!;
    expect(c).toEqual({ at: 5, list: [{ tag: "v1", name: "n", url: "https://github.com/BerkayMAK18/tap2-coach/releases", date: "", body: "3" }] });
  });
  it("Datum auf Deutsch", () => {
    expect(pnFmt("2026-11-01")).toBe("1. November 2026");
    expect(pnFmt("")).toBe("");
  });
  it("fett und kursiv wie die Live-App (kursiv nur mit Leerraum davor/danach)", () => {
    expect(pnInline("**Neu:** Suche *jetzt* schneller, a*b*c")).toEqual([{ t: "Neu:", b: true }, { t: " Suche " }, { t: "jetzt", i: true }, { t: " schneller, a*b*c" }]);
    expect(pnInline("<script>")).toEqual([{ t: "<script>" }]);
  });
  it("Markdown: Überschrift, Absatz, Liste mit Unterliste (Unterliste als eigenes ul in der Liste, wie die Live-App)", () => {
    expect(pnMd("## Neu\r\n- A\n  - A1\n- B\n\nText")).toEqual([
      { h4: [{ t: "Neu" }] },
      { ul: [{ li: [{ t: "A" }] }, { ul: [{ li: [{ t: "A1" }] }] }, { li: [{ t: "B" }] }] },
      { p: [{ t: "Text" }] },
    ]);
  });
});
