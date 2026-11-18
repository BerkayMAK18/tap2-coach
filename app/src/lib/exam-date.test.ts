import { describe, expect, it } from "vitest";
import { EXAM_DAY } from "@/config";
import { formatExamDate, isISODate, resolveExamDate } from "./exam-date";

describe("Prüfungstermin", () => {
  it("löst die bestätigten IT-Prüfungsperioden auf", () => {
    expect(resolveExamDate("winter-2026-27", "2027-01-01")).toBe("2026-11-25");
    expect(resolveExamDate("summer-2027", "2027-01-01")).toBe("2027-04-28");
  });

  it("akzeptiert gültige manuelle Daten und fällt bei ungültigen auf den Standard zurück", () => {
    expect(resolveExamDate("custom", "2027-06-03")).toBe("2027-06-03");
    expect(resolveExamDate("custom", "2027-02-30")).toBe(EXAM_DAY);
  });

  it("prüft und formatiert ISO-Daten", () => {
    expect(isISODate("2028-02-29")).toBe(true);
    expect(isISODate("2027-02-29")).toBe(false);
    expect(formatExamDate("2027-04-28")).toBe("28.04.2027");
  });
});