import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("behält Textfarbe neben eigener Schriftgröße", () => {
    expect(cn("bg-ink text-canvas", "text-body-300")).toBe("bg-ink text-canvas text-body-300");
  });
  it("überschreibt gleiche Gruppe", () => {
    expect(cn("text-body-200", "text-heading-100")).toBe("text-heading-100");
    expect(cn("text-ink", "text-canvas")).toBe("text-canvas");
  });
});
