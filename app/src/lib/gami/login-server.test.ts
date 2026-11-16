import { describe, expect, it } from "vitest";
import { fix, fresh } from "./state";
import { applyServerLogin, loginOffer, type Ctx } from "./core";
import { CAL } from "./items";

const fx = { saves: 0, toasts: [] as string[] };
const ctx = { today: () => "2026-11-16", fx: { save: () => { fx.saves++; }, toast: (t: string) => fx.toasts.push(t), confetti() {} } } as unknown as Ctx;
const base = () => { const G = fresh(); fix(G); return G; };

describe("Login-Bonus mit Konto (Server entscheidet)", () => {
  it("neu abgeholt: Belohnung des Server-Kalendertags, Kalender danach auf dem nächsten Tag", () => {
    const G = base(), f0 = G.federn;
    expect(applyServerLogin(G, ctx, { ok: true, day: "2026-11-16", idx: 1, round: 1, streak: 2 })).toBe(true);
    expect(G.federn).toBe(f0 + CAL[1].f!);
    expect({ lc: G.loginClaimed, idx: G.calIdx, r: G.calRound, s: G.loginStreak }).toEqual({ lc: "2026-11-16", idx: 2, r: 1, s: 2 });
    expect(loginOffer(G, "2026-11-16")).toBeNull();
  });
  it("schon abgeholt: keine Belohnung, egal wie oft – nur der Kalender wird auf den Server-Stand gesetzt", () => {
    const G = base(); G.loginClaimed = "2026-11-15"; G.calIdx = 0; // lokal zurückgesprungen (z. B. durch einen Abgleich)
    const f0 = G.federn, t0 = G.tickets;
    for (let i = 0; i < 5; i++) expect(applyServerLogin(G, ctx, { ok: false, already: true, day: "2026-11-16", idx: 0, round: 1, streak: 1 })).toBe(false);
    expect([G.federn, G.tickets]).toEqual([f0, t0]);
    expect({ lc: G.loginClaimed, idx: G.calIdx }).toEqual({ lc: "2026-11-16", idx: 1 });
    expect(loginOffer(G, "2026-11-16")).toBeNull();
  });
  it("Tag 7 schließt die Runde ab", () => {
    const G = base();
    applyServerLogin(G, ctx, { ok: true, day: "2026-11-16", idx: 6, round: 2, streak: 7 });
    expect({ idx: G.calIdx, r: G.calRound }).toEqual({ idx: 0, r: 3 });
  });
  it("ungültige Antwort des Servers ändert nichts", () => {
    const G = base(), before = JSON.stringify(G);
    [null, {}, { ok: true, day: "heute", idx: 0 }, { ok: true, day: "2026-11-16", idx: 9 }, { ok: true, day: "2026-11-16", idx: 1.5 }].forEach((s) => expect(applyServerLogin(G, ctx, s as never)).toBe(false));
    expect(JSON.stringify(G)).toBe(before);
  });
});
