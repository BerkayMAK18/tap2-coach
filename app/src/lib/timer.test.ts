import { describe, expect, it } from "vitest";
import { fmtClock, tmLeft, tmState } from "@/store/timer";

describe("Timer", () => {
  it("Anzeige wie in der Live-App", () => {
    expect([90 * 60, 59, 3725, -61].map(fmtClock)).toEqual(["1:30:00", "0:59", "1:02:05", "−1:01"]);
  });
  it("Restzeit läuft ins Minus und bleibt nach Stopp stehen", () => {
    const TM = { key: "t:P01", min: 1, start: 0, stop: null };
    expect(tmLeft(TM, 90_000)).toBe(-30);
    expect(tmLeft({ ...TM, stop: 30_000 }, 999_999)).toBe(30);
    expect([tmState(TM, "t:P01"), tmState(TM, "x"), tmState({ ...TM, stop: 1 }, "t:P01")]).toEqual(["run", "idle", "done"]);
  });
});
