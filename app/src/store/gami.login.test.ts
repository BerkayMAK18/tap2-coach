// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { today, addDays } from "@/lib/dates";

/** Login-Bonus mit Konto: ein eingemischter alter Stand darf das Fenster nicht wieder aufspringen lassen */
describe("Login-Bonus: vom Server bestätigter Tag gilt sofort", () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); vi.useRealTimers(); });

  it("nach einem Abgleich mit altem Stand bleibt der Bonus abgeholt (kein Fenster, keine Belohnung)", async () => {
    const t = today(), y = addDays(t, -1);
    localStorage.setItem("tap2coach-login-server", JSON.stringify({ day: t, idx: 2, round: 1, streak: 3 }));
    const { gami, gm } = await import("./gami");
    const { pack } = await import("@/lib/gami/state");
    const G = gami();
    expect(G.loginClaimed).toBe(t); expect(G.calIdx).toBe(3); // schon beim Laden auf dem Server-Stand
    const f0 = G.federn;
    const old = JSON.parse(JSON.stringify(G)); old.loginClaimed = y; old.lastLogin = y; old.calIdx = 0; old.u = Date.now() + 1e6; old.earned = G.earned + 999;
    gm.merge(pack(old));
    expect(gami().loginClaimed).toBe(t); expect(gami().calIdx).toBe(3); expect(gami().federn).toBe(f0);
  });

  it("anderer Tab speichert einen alten Stand → wird sofort auf den Server-Stand korrigiert", async () => {
    const t = today(), y = addDays(t, -1);
    localStorage.setItem("tap2coach-login-server", JSON.stringify({ day: t, idx: 0, round: 1, streak: 1 }));
    const { gami } = await import("./gami");
    const stale = JSON.parse(JSON.stringify(gami())); stale.loginClaimed = y; stale.calIdx = 0;
    window.dispatchEvent(new StorageEvent("storage", { key: "tap2coach-gami", newValue: JSON.stringify(stale) }));
    expect(gami().loginClaimed).toBe(t);
  });

  it("Bestätigung von gestern zählt heute nicht – der Bonus ist wieder offen", async () => {
    const t = today(), y = addDays(t, -1);
    localStorage.setItem("tap2coach-login-server", JSON.stringify({ day: y, idx: 0, round: 1, streak: 1 }));
    const { gami } = await import("./gami");
    expect(gami().loginClaimed).not.toBe(t);
  });
});
