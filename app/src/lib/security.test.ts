/** Tests der Sicherheitsregeln (Security-Check 13.11.2026). */
import { afterEach, describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";
import { storagePathSchema } from "./learn-types";
import { isTutorAllowed } from "./ai-provider.server";

describe("safeRedirect", () => {
  it("erlaubt interne Pfade", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard");
    expect(safeRedirect("/session/abc?x=1")).toBe("/session/abc?x=1");
  });
  it("lehnt externe Ziele ab", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "dashboard", "/a\nb", 42, null, "/" + "a".repeat(400)]) {
      expect(safeRedirect(bad)).toBeUndefined();
    }
  });
});

describe("storagePathSchema", () => {
  const u = "0b7c5c1e-1234-4abc-9def-0123456789ab";
  it("erlaubt die Pfade der App", () => {
    for (const ok of [`${u}/sources/${u}`, `${u}/${u}/${u}-notiz_1.pdf`, `${u}/diagrams/${u}.png`]) {
      expect(storagePathSchema.safeParse(ok).success).toBe(true);
    }
  });
  it("lehnt Pfad-Tricks ab", () => {
    for (const bad of [`${u}/../other/x`, `${u}/./x`, `${u}/a\\b`, "/etc/passwd", u, `${u}/a/b/c/d`, `${u}/a b`]) {
      expect(storagePathSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("isTutorAllowed", () => {
  const prev = process.env.TUTOR_ALLOWED_USER_IDS;
  afterEach(() => { process.env.TUTOR_ALLOWED_USER_IDS = prev; });
  it("ist ohne Liste für niemanden offen (fail-closed)", () => {
    delete process.env.TUTOR_ALLOWED_USER_IDS;
    expect(isTutorAllowed("abc")).toBe(false);
    process.env.TUTOR_ALLOWED_USER_IDS = "";
    expect(isTutorAllowed("")).toBe(false);
  });
  it("erlaubt nur gelistete IDs", () => {
    process.env.TUTOR_ALLOWED_USER_IDS = "id-1, id-2";
    expect(isTutorAllowed("id-2")).toBe(true);
    expect(isTutorAllowed("id-3")).toBe(false);
    expect(isTutorAllowed(undefined)).toBe(false);
  });
});
