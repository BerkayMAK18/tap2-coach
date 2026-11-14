// @vitest-environment happy-dom
/**
 * Tutor-XP und die Live-App (main): Eine bewertete Tutor-Aufgabe zählt genau wie eine normale Antwort – derselbe Aufruf
 * des Belohnungs-Moduls (onAnswer, in der App über gm.answer) mit rewardArgs (lib/tutor-session.ts): XP mit Combo-Bonus
 * und Trank, Federn, Serie, Tagesquests, keine Obergrenze. Geprüft gegen das Original der Live-App (golden/original.js =
 * Abschnitt aus index.html auf main, v2.8):
 * - eine Tutor-Aufgabe ergibt in Dev-App und main exakt denselben Belohnungs-Stand wie eine Antwort,
 * - main übernimmt die Tutor-XP beim Abgleich (mirror: XP vom weiter fortgeschrittenen Stand), Paket-Format gleich,
 * - main schickt danach genau diese XP an tap2_lb_push.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_Q } from "@/content/catalog";
import { rewardArgs } from "../tutor-session";
import { onAnswer } from "./core";
import { mult } from "./items";
import { lbId } from "./lb";
import { merge, pack, parseStored, stab, type GState } from "./state";
import { newCtx, oldGami, seeded, stateWith, type World } from "./golden/harness";

const DAY = "2026-11-14", KEY = "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2-3456-7890";
const START = { earned: 4000, level: 12, xp: 0, federn: 370, tickets: 0, loginClaimed: DAY, lastLogin: DAY, loginStreak: 3, calIdx: 2 };
const dev = (raw: object = START) => { const w: World = { S: stateWith([]), day: DAY, synced: true, syncKey: KEY }; const G = parseStored(JSON.stringify(raw)); return { G, ctx: newCtx(w, () => G), w }; };
const main = (raw: object = START, rpc?: World["rpc"]) => { localStorage.setItem("tap2coach-gami", JSON.stringify(raw)); const o = oldGami({ S: stateWith([]), day: DAY, synced: true, syncKey: KEY, conf: true, rpc }); o.init(); return o; };
const T2 = { id: "tutor:s1:A1", topic: "T02" }; // SQL (Teil 2)
/** Tutor-Aufgabe bewertet – derselbe Aufruf wie in store/tutor.ts */
const tutor = (d: ReturnType<typeof dev>, punkte: number, max: number, sich?: 0 | 1 | 2 | 3) => { const r = rewardArgs({ punkte, max, sich }); onAnswer(d.G, d.ctx, T2, r.ok, r.unsure, r.f, r.t); };

beforeEach(() => { vi.useFakeTimers({ now: new Date("2026-11-14T10:00:00"), toFake: ["Date", "setTimeout", "clearTimeout"] }); localStorage.clear(); const r = seeded(4); vi.spyOn(Math, "random").mockImplementation(() => r()); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Tutor-Aufgabe = normale Antwort", () => {
  it("richtig ab der Hälfte der Punkte, unsicher bei „geraten“/„unsicher“", () => {
    expect(rewardArgs({ punkte: 2, max: 4 })).toEqual({ ok: true, unsure: false, f: -1, t: 1 });
    expect(rewardArgs({ punkte: 1.5, max: 4, sich: 3 })).toEqual({ ok: false, unsure: false, f: -1, t: 0 });
    expect(rewardArgs({ punkte: 4, max: 4, sich: 1 }).unsure).toBe(true);
    expect(rewardArgs({ punkte: 4, max: 4, sich: 2 }).unsure).toBe(false);
  });
  it("XP mit Combo wie Antworten, keine Obergrenze: 30 richtige Aufgaben in Folge", () => {
    const d = dev(); let expected = 0;
    for (let i = 1; i <= 30; i++) { tutor(d, 6, 8, 3); expected += Math.round(10 * mult(i)); }
    expect(d.G.earned).toBe(4000 + expected); expect(d.G.combo).toBe(30); expect(d.G.today).toMatchObject({ answered: 30, correct: 30, t2: 30 });
  });
  it("Serie läuft mit Lernrunden-Antworten weiter; unter der Hälfte endet sie, unsicher gibt keine XP", () => {
    const d = dev();
    tutor(d, 6, 8); onAnswer(d.G, d.ctx, BASE_Q[0], true, false, -1, 1); expect(d.G.combo).toBe(2);
    tutor(d, 3, 8); expect(d.G.combo).toBe(0);
    const e = d.G.earned; tutor(d, 8, 8, 0); expect(d.G.earned).toBe(e); expect(d.G.combo).toBe(0);
  });
  it("gleicher Belohnungs-Stand wie das Original der Live-App für dieselbe Folge", () => {
    const d = dev(), m = main();
    for (const [p, max, s] of [[6, 8, 3], [8, 8, 2], [1, 4, 3], [4, 4, undefined], [3, 6, 1]] as const) {
      tutor(d, p, max, s); const r = rewardArgs({ punkte: p, max, sich: s }); m.answer(T2, r.ok, r.unsure, r.f, r.t);
    }
    const md = m.data() as GState;
    for (const k of ["earned", "xp", "level", "federn", "combo", "best"] as const) expect(d.G[k]).toBe(md[k]);
    expect(d.G.today).toEqual(md.today);
  });
});

describe("Live-App (main) übernimmt Tutor-XP", () => {
  it("Abgleich Dev → main: gleiche XP, gleiches Level, Paket-Format identisch", () => {
    const d = dev(), m = main();
    merge(d.G, m.pack());
    for (let i = 0; i < 5; i++) { vi.advanceTimersByTime(1000); tutor(d, 5 + i, 10, 3); }
    const p = pack(d.G); m.merge(p);
    const md = m.data() as GState;
    expect(md.earned).toBe(d.G.earned); expect(md.level).toBe(d.G.level); expect(md.xp).toBe(d.G.xp);
    expect(Object.keys(m.pack()).sort()).toEqual(Object.keys(p).sort());
    merge(d.G, m.pack()); expect(stab(pack(d.G))).toBe(stab(m.pack()));
  });
  it("main meldet der Rangliste genau die übernommenen XP (tap2_lb_push)", async () => {
    const d = dev(); for (let i = 0; i < 3; i++) tutor(d, 10, 10, 3);
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
