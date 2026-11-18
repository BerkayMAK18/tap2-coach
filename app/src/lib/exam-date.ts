import { DEFAULT_EXAM_TERM, EXAM_DAY, EXAM_TERMS, type ExamTermId } from "@/config";

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function resolveExamDate(term: ExamTermId, customDate: string): string {
  if (term === "custom") return isISODate(customDate) ? customDate : EXAM_DAY;
  return EXAM_TERMS.find((option) => option.id === term)?.date ?? EXAM_TERMS.find((option) => option.id === DEFAULT_EXAM_TERM)!.date;
}

export const formatExamDate = (date: string) => date.split("-").reverse().join(".");