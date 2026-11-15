import { describe, expect, it } from "vitest";
import { plausibleG } from "./transfer";

describe("Belohnungen aus Übertragungs-Links", () => {
  it("übernimmt normale Stände (kompakt und ganze Sicherung)", () => {
    expect(plausibleG({ x: 4321, l: 12 })).toBe(true);
    expect(plausibleG({ earned: 0, level: 1, owned: {} })).toBe(true);
  });
  it("verwirft unmögliche Werte aus präparierten Links", () => {
    expect(plausibleG({ x: 1e12, l: 12 })).toBe(false);
    expect(plausibleG({ x: -5, l: 1 })).toBe(false);
    expect(plausibleG({ x: 100, l: 99999 })).toBe(false);
    expect(plausibleG({ x: "abc", l: 1 })).toBe(false);
  });
});
