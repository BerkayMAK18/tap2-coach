import { describe, expect, it } from "vitest";
import { addDays, today } from "@/lib/dates";
import { fix, fresh, merge, pack } from "./state";
import { claimLogin, claimable, loginOffer, type Ctx } from "./core";

const ctx = { today, fx: { save() {}, toast() {}, confetti() {} } } as unknown as Ctx;
const base = () => { const G = fresh(); fix(G); return G; };

describe("Login-Kalender: Tage aus der Zukunft", () => {
  it("Abgleich mit einem Stand aus der Zukunft setzt das heutige Abholen nicht zurück", () => {
    const t = today(), future = addDays(t, 3);
    const cloud = base(); cloud.loginClaimed = future; cloud.lastLogin = future; cloud.calIdx = 0; cloud.loginStreak = 1;
    const G = base(); G.lastLogin = addDays(t, -1); G.loginClaimed = addDays(t, -1); G.calIdx = 1; G.loginStreak = 1;
    merge(G, pack(cloud)); // vorher: der Zukunfts-Stand gewann, der Bonus war offen
    const o = loginOffer(G, t);
    if (o) expect(claimLogin(G, ctx, o)).toBe(true);
    const after = { lc: G.loginClaimed, idx: G.calIdx };
    merge(G, pack(cloud)); merge(G, pack(cloud));
    expect(G.loginClaimed).toBe(t);
    expect({ lc: G.loginClaimed, idx: G.calIdx }).toEqual(after);
    expect(loginOffer(G, t)).toBeNull();
    expect(claimable(G, t) && G.loginClaimed !== t).toBe(false);
  });
  it("eigener Stand, der schon ein Zukunftsdatum übernommen hat, heilt sich beim nächsten Abholen", () => {
    const t = today(), future = addDays(t, 4);
    const cloud = base(); cloud.loginClaimed = future; cloud.lastLogin = future;
    const G = base(); G.loginClaimed = future; G.lastLogin = future; G.calIdx = 3; // vom alten Abgleich übernommen
    const o = loginOffer(G, t)!; expect(claimLogin(G, ctx, o)).toBe(true);
    merge(G, pack(cloud));
    expect(G.loginClaimed).toBe(t); expect(loginOffer(G, t)).toBeNull();
  });
  it("Tagesquests aus der Zukunft ersetzen die heutigen nicht", () => {
    const t = today(), cloud = base();
    cloud.today = { day: addDays(t, 2), answered: 99, correct: 99, maxCombo: 0, sowi: 0, t2: 0, green: 0, fixed: 0, fresh: 0 };
    const G = base(); claimable(G, t); const q = JSON.stringify(G.quests);
    merge(G, pack(cloud));
    expect(G.today?.day).toBe(t); expect(JSON.stringify(G.quests)).toBe(q);
  });
});
