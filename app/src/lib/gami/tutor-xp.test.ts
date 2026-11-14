// @vitest-environment happy-dom
/**
 * Tutor-XP und die Live-App (main): Die Dev-App vergibt Tutor-XP über das Belohnungs-Modul (onTutor → addXP). Sie stehen
 * damit in G.earned/xp/level, im Sync-Paket (pack: x/l/p) und in der Rangliste. Geprüft wird gegen das Original der
 * Live-App (golden/original.js = Abschnitt aus index.html auf main, v2.8):
 * - main übernimmt die Tutor-XP beim Abgleich (mirror: XP vom weiter fortgeschrittenen Stand) und rechnet nichts um,
 * - main schickt danach genau diese XP an tap2_lb_push,
 * - Format unverändert: das Paket der Dev-App hat dieselben Felder wie das von main,
 * - Tagesquests und Serie zählen Tutor-Aufgaben wie Antworten, die Tagesobergrenze bleibt weit unter der Bremse der
 *   Rangliste (30 000 XP pro Tag).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stab, fix, merge, pack, parseStored, type GState } from "./state";
import { mult, need } from "./items";
import { onAnswer, onTutor, rollDay } from "./core";
import { lbId } from "./lb";
import { newCtx, oldGami, seeded, stateWith, type World } from "./golden/harness";
import { XP_PRO_PUNKT, XP_TAG_MAX, tutorXp } from "../tutor-state";
import { BASE_Q } from "@/content/catalog";

const DAY = "2026-11-14", KEY = "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2-3456-7890";
const START = { earned: 4000, level: 12, xp: 0, federn: 370, tickets: 0, loginClaimed: DAY, lastLogin: DAY, loginStreak: 3, calIdx: 2 };
const dev = (raw: object = START) => { const w: World = { S: stateWith([]), day: DAY, synced: true, syncKey: KEY }; const G = parseStored(JSON.stringify(raw)); return { G, ctx: newCtx(w, () => G), w }; };
const main = (raw: object = START, rpc?: World["rpc"]) => { localStorage.setItem("tap2coach-gami", JSON.stringify(raw)); const o = oldGami({ S: stateWith([]), day: DAY, synced: true, syncKey: KEY, conf: true, rpc }); o.init(); return o; };
const T2 = { id: "tutor:s1:A1", topic: "T02" }; // SQL (Teil 2)

beforeEach(() => { vi.useFakeTimers({ now: new Date("2026-11-14T10:00:00"), toFake: ["Date", "setTimeout", "clearTimeout"] }); localStorage.clear(); const r = seeded(4); vi.spyOn(Math, "random").mockImplementation(() => r()); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("onTutor (Dev-App)", () => {
  it("XP nach Punkten über addXP: earned, xp und level bleiben stimmig (wie bei Antworten)", () => {
    const d = dev(), xp = tutorXp(8);
    expect(xp).toBe(8 * XP_PRO_PUNKT);
    const gain = onTutor(d.G, d.ctx, T2, 8, 10, false, xp, XP_TAG_MAX);
    expect(gain).toBe(Math.round(xp * mult(1))); expect(d.G.earned).toBe(4000 + gain);
    const copy = parseStored(JSON.stringify(d.G)); fix(copy); expect(copy.level).toBe(d.G.level); expect(copy.xp).toBe(d.G.xp); // fix() ändert nichts
    expect(d.G.xp).toBeLessThan(need(d.G.level));
  });
  it("zählt für Tagesquests und Serie wie eine Antwort; unter der Hälfte oder unsicher: keine Serie", () => {
    const d = dev(); rollDay(d.G, DAY);
    onTutor(d.G, d.ctx, T2, 6, 8, false, tutorXp(6), XP_TAG_MAX);
    expect(d.G.today).toMatchObject({ answered: 1, correct: 1, t2: 1 }); expect(d.G.combo).toBe(1);
    onAnswer(d.G, d.ctx, BASE_Q[0], true, false, -1, 1); expect(d.G.combo).toBe(2); // Serie läuft mit normalen Antworten weiter
    onTutor(d.G, d.ctx, T2, 3, 8, false, tutorXp(3), XP_TAG_MAX);
    expect(d.G.combo).toBe(0); expect(d.G.today).toMatchObject({ answered: 3, correct: 2 });
    const before = d.G.earned; onTutor(d.G, d.ctx, T2, 8, 8, true, tutorXp(8), XP_TAG_MAX);
    expect(d.G.combo).toBe(0); expect(d.G.earned - before).toBe(tutorXp(8)); // unsicher: XP nach Punkten, aber ohne Serien-Bonus
  });
  it("Tagesobergrenze: nie mehr als der Rest des Tages, auch mit Serien-Bonus und Trank", () => {
    const d = dev({ ...START, combo: 20, xp2Left: 5 });
    expect(onTutor(d.G, d.ctx, T2, 25, 25, false, tutorXp(25), 40)).toBe(40);
    expect(onTutor(d.G, d.ctx, T2, 25, 25, false, tutorXp(25), 0)).toBe(0);
    // Höchstmöglich pro Tag (alle Geräte) bleibt weit unter der Bremse von tap2_lb_push (30 000 XP/Tag)
    expect(XP_TAG_MAX).toBeLessThan(30000 / 10);
  });
});

describe("Live-App (main) übernimmt Tutor-XP", () => {
  it("Abgleich Dev → main: gleiche XP, gleiches Level, Paket-Format identisch", () => {
    const d = dev(), m = main();
    merge(d.G, m.pack()); // wie beim Verbinden
    for (let i = 0; i < 5; i++) { vi.advanceTimersByTime(1000); onTutor(d.G, d.ctx, T2, 4 + i, 10, false, tutorXp(4 + i), XP_TAG_MAX); }
    const p = pack(d.G); m.merge(p);
    const md = m.data() as GState;
    expect(md.earned).toBe(d.G.earned); expect(md.level).toBe(d.G.level); expect(md.xp).toBe(d.G.xp);
    expect(Object.keys(m.pack()).sort()).toEqual(Object.keys(p).sort());
    // und zurück: main → Dev verändert nichts mehr (beide Geräte gleich)
    merge(d.G, m.pack()); expect(stab(pack(d.G))).toBe(stab(m.pack()));
  });
  it("gleichzeitig: Tutor-XP auf Dev, Lernrunden auf main – nach dem Abgleich zählt der weiter fortgeschrittene Stand (Regel von main)", () => {
    const d = dev(), m = main(); merge(d.G, m.pack());
    onTutor(d.G, d.ctx, T2, 10, 10, false, tutorXp(10), XP_TAG_MAX); // +30 XP
    m.answer(BASE_Q[0], true, false, -1, 1); // +10 XP auf main
    m.merge(pack(d.G)); merge(d.G, m.pack());
    expect((m.data() as GState).earned).toBe(d.G.earned); expect(d.G.earned).toBe(4030);
  });
  it("main meldet der Rangliste genau die übernommenen XP (tap2_lb_push)", async () => {
    const d = dev(); onTutor(d.G, d.ctx, T2, 10, 10, false, tutorXp(10), XP_TAG_MAX);
    const calls: Record<string, unknown>[] = [];
    localStorage.setItem("tap2coach-lb", JSON.stringify({ joined: true, id: await lbId(KEY), name: "Tester" }));
    const m = main(START, async (fn, a) => { if (fn === "tap2_lb_push") calls.push(a); return { ok: true }; });
    m.merge(pack(d.G));
    m.boot(""); await vi.advanceTimersByTimeAsync(5000);
    // lbId rechnet mit echtem WebCrypto (nicht von den Schein-Timern gesteuert): kurz echte Ereignisschleife abwarten
    for (let i = 0; i < 400 && !calls.length; i++) { await new Promise((r) => setImmediate(r)); await vi.advanceTimersByTimeAsync(50); }
    expect(calls.length).toBeGreaterThan(0); expect(calls.at(-1)).toMatchObject({ p_xp: d.G.earned, p_level: d.G.level });
  });
});
