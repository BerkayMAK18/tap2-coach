/** Laufendes Operator-Training (UI.od der Live-App): überdauert Seitenwechsel, nicht das Neuladen. */
import { create } from "zustand";
import type { Drill } from "@/lib/tipps";

export const useDrill = create<{ d: Drill | null; set: (d: Drill | null) => void }>((set) => ({ d: null, set: (d) => set({ d }) }));
