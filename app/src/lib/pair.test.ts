import { describe, expect, it } from "vitest";
import { newSyncKey } from "./crypto";
import { PAIR_AB, codeFmt, newPairCode, pairHash, pairOpen, pairSeal, parsePairInput } from "./pair";

describe("Gerät koppeln", () => {
  it("Kurzcode: 6 Zeichen ohne 0/O und 1/I, Anzeige mit Bindestrich", () => {
    const c = newPairCode();
    expect(c).toHaveLength(6);
    expect([...c].every((x) => PAIR_AB.includes(x))).toBe(true);
    expect(codeFmt("K7P4QX")).toBe("K7P-4QX");
  });
  it("Eingabe: Schlüssel, Code (auch klein und mit Bindestrich) oder Fehler", () => {
    const key = newSyncKey();
    expect(parsePairInput(key)).toEqual({ key });
    expect(parsePairInput("k7p-4qx")).toEqual({ code: "K7P4QX" });
    expect(parsePairInput("K7P-4Q0")).toEqual({ err: "Der Code hat 6 Zeichen, z. B. K7P-4QX." }); // 0 kommt nicht vor
    expect(parsePairInput("abc")).toHaveProperty("err");
  });
  it("Schlüssel mit Code verschlüsseln und wieder öffnen; falscher Code scheitert", async () => {
    const key = newSyncKey(), code = "K7P4QX", p = await pairSeal(key, code);
    expect(p).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(await pairOpen(p, code)).toBe(key);
    await expect(pairOpen(p, "K7P4QY")).rejects.toThrow();
  }, 20000);
  it("Prüfsumme wie die Live-App (SHA-256 von „tap2-pair|CODE“)", async () => {
    expect(await pairHash("K7P4QX")).toMatch(/^[0-9a-f]{64}$/);
    expect(await pairHash("K7P4QX")).not.toBe(await pairHash("K7P4QY"));
  });
});
