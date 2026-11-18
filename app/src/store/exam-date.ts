import { create } from "zustand";
import { DEFAULT_EXAM_TERM, EXAM_DAY, EXAM_TERMS, type ExamTermId } from "@/config";
import { isISODate, resolveExamDate } from "@/lib/exam-date";

const KEY = "tap2coach-pruefungstermin";
type ExamSettings = {
  term: ExamTermId;
  customDate: string;
  setTerm: (term: ExamTermId) => void;
  setCustomDate: (date: string) => void;
};
type SavedSettings = Pick<ExamSettings, "term" | "customDate">;

function readSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { term: DEFAULT_EXAM_TERM, customDate: EXAM_DAY };
    const value = JSON.parse(raw) as Partial<SavedSettings>;
    const term = value.term === "custom" || EXAM_TERMS.some((option) => option.id === value.term) ? value.term : DEFAULT_EXAM_TERM;
    const customDate = typeof value.customDate === "string" && isISODate(value.customDate) ? value.customDate : EXAM_DAY;
    return { term, customDate } as SavedSettings;
  } catch {
    return { term: DEFAULT_EXAM_TERM, customDate: EXAM_DAY };
  }
}

const initial = typeof window === "undefined" ? { term: DEFAULT_EXAM_TERM, customDate: EXAM_DAY } : readSettings();
const save = (settings: SavedSettings) => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* privater Modus */ } };

export const useExamSettings = create<ExamSettings>((set, get) => ({
  ...initial,
  setTerm: (term) => { const settings = { ...get(), term }; save(settings); set({ term }); },
  setCustomDate: (customDate) => {
    if (!isISODate(customDate)) return;
    const settings = { ...get(), customDate };
    save(settings); set({ customDate });
  },
}));

export const useExamDay = () => useExamSettings((s) => resolveExamDate(s.term, s.customDate));
export const getExamDay = () => resolveExamDate(useExamSettings.getState().term, useExamSettings.getState().customDate);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    useExamSettings.setState(readSettings());
  });
}