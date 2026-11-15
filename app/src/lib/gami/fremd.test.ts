// @vitest-environment happy-dom
/**
 * Fremde Belohnungs-Stände (Sync mit fremdem Schlüssel, präparierter Import-Link) dürfen die App nicht kaputt machen:
 * Prototyp-Namen wie „constructor“ sind nie Tier, Gegenstand oder Titel, und „__proto__“ verändert nie Object.prototype.
 */
import { describe, expect, it } from "vitest";
import { figureInner } from "./figure";
import { ANIMALS } from "./art";
import { IT } from "./items";
import { fix, fresh, merge, pack, parseStored, unpack } from "./state";

const evil = ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf"];

describe("Fremde Werte im Belohnungs-Stand", () => {
  it("Prototyp-Namen gelten nie als Tier oder Gegenstand", () => {
    evil.forEach((k) => { expect(ANIMALS[k]).toBeUndefined(); expect(IT[k]).toBeUndefined(); });
  });

  it("Kompaktes Paket mit Figur „constructor“ und neuerem Zeitpunkt ändert die Figur nicht", () => {
    const G = fresh(); fix(G);
    const p = { ...pack(G), c: "constructor", a: Date.now() + 1e9 };
    merge(G, p); fix(G);
    expect(G.char).toBe("rabe");
    expect(() => figureInner(G.char, G.equip[G.char] ?? {})).not.toThrow();
  });

  it("Ganze Sicherung mit Figur, Banner und Titel aus Prototyp-Namen wird repariert", () => {
    const G = parseStored(JSON.stringify({ ...fresh(), owned: {}, char: "constructor", banner: "toString", title: "constructor", titles: { constructor: 1 } }));
    expect(G.char).toBe("rabe"); expect(G.banner).toBe("rabe"); expect(G.title).toBe("");
  });

  it("Events mit Schlüssel „__proto__“ verändern Object.prototype nicht", () => {
    const G = fresh(); fix(G);
    const p = JSON.parse(JSON.stringify(pack(G)).replace(/}$/, ',"ev":{"__proto__":{"best":5,"kap":{"x":1}},"constructor":{"best":3}}}'));
    merge(G, p);
    expect(({} as Record<string, unknown>).best).toBeUndefined();
    expect(({} as Record<string, unknown>).kap).toBeUndefined();
    expect(Object.hasOwn(G.ev, "constructor")).toBe(false);
  });

  it("unpack übernimmt keine Ausrüstung für Prototyp-Namen", () => {
    const G = fresh(); fix(G);
    const g = unpack({ ...pack(G), e: { constructor: "a.b.c" } })!;
    expect(Object.hasOwn(g.equip, "constructor")).toBe(false);
  });
});
