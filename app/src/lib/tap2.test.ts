import { describe, expect, it } from "vitest";
import { buildRound, nextState } from "./tap2";

const now = new Date("2026-11-12T10:00:00Z");
describe("spaced repetition", () => {
  it("sure answers walk through 1, 3, 7, 14, 30 days", () => {
    let s = nextState(undefined, "sure", now);
    expect(s.due).toBe("2026-11-13");
    s = nextState(s, "sure", now); expect(s.due).toBe("2026-11-15");
    s = nextState(s, "sure", now); expect(s.due).toBe("2026-11-19");
    s = nextState(s, "sure", now); expect(s.due).toBe("2026-11-26");
    s = nextState(s, "sure", now); expect(s.due).toBe("2026-12-12");
  });
  it("unsure or guessed comes back tomorrow at box 0", () => {
    const s = nextState({ box: 3, correct: 3, wrong: 0 }, "unsure", now);
    expect(s).toMatchObject({ box: 0, due: "2026-11-13" });
  });
  it("rounds hold at most 20 questions, due ones first", () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: "c" + i, type: "card" as const, topic: "T01", q: "", a: "", note: "" }));
    const r = buildRound(items, [{ item_id: "c29", topic: "T01", box: 1, due: "2026-11-01", correct: 1, wrong: 0 }], 20, now);
    expect(r.length).toBe(20);
    expect(r[0].id).toBe("c29");
  });
});
