// @vitest-environment happy-dom
/** Ranglisten-ID: mit Konto ein Eintrag pro Konto (gleich auf allen Geräten), sonst wie die Live-App. */
import { describe, expect, it } from "vitest";
import { lbId } from "./lb";

describe("lbId", () => {
  const KEY = "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2-3456-7890", U = "3f0c2a8e-1111-4222-8333-444455556666";
  it("mit Konto: unabhängig von Gerät und Sync-Schlüssel, je Konto verschieden", async () => {
    localStorage.clear();
    const a = await lbId(KEY, U), b = await lbId(null, U);
    localStorage.clear(); // anderes Gerät (neuer Gerätetoken)
    expect(await lbId(null, U)).toBe(a); expect(b).toBe(a);
    expect(await lbId(null, U.replace("6666", "7777"))).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("ohne Konto wie die Live-App: Sync-Schlüssel bzw. Gerätetoken", async () => {
    localStorage.clear();
    const s = await lbId(KEY), t = await lbId(null);
    expect(s).not.toBe(await lbId(null, "x")); expect(t).toBe(await lbId(null)); expect(t).not.toBe(s);
  });
});
