import { create } from "zustand";
import type { LearningArea } from "@/content/catalog";

const KEY = "tap2coach-bereich";
const readArea = (): LearningArea => {
  try { return localStorage.getItem(KEY) === "fisi" ? "fisi" : "fiae"; }
  catch { return "fiae"; }
};

type LearningAreaStore = { area: LearningArea; setArea: (area: LearningArea) => void };

export const useLearningArea = create<LearningAreaStore>((set) => ({
  area: typeof window === "undefined" ? "fiae" : readArea(),
  setArea: (area) => {
    try { localStorage.setItem(KEY, area); } catch { /* privater Modus */ }
    set({ area });
  },
}));