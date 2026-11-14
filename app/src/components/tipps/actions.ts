/** Aktionen der Lernplan-Einträge (bindPlan() der Live-App) – genutzt von Übersicht und Lernplan. */
import { useNavigate } from "@tanstack/react-router";
import { learnList, learnTopic } from "@/lib/lernen";
import { useProgress } from "@/store/progress";
import { usePruefung } from "@/store/pruefung";
import { useStartRound } from "@/components/lernen/ui";
import type { PlanActions } from "@/components/lernen/bits";

/** Ansicht der Live-App → Pfad (wie PATH im Grundgerüst) */
export const VIEW_PATH: Record<string, string> = { start: "/", lernen: "/lernen", aufgaben: "/aufgaben", pruefung: "/pruefung", tipps: "/tipps", operatoren: "/operatoren", plan: "/plan", tutorial: "/tutorial", events: "/events" };

export function usePlanActions(): PlanActions {
  const navigate = useNavigate(), startRound = useStartRound();
  const go = (v: string) => { void navigate({ to: VIEW_PATH[v] ?? "/" }); window.scrollTo({ top: 0 }); };
  return {
    topic: (tid) => startRound(learnTopic(useProgress.getState().S, tid)),
    sim: (t) => { usePruefung.getState().setPk({ mode: t === "wiso" ? "sim" : "real", teil: t }); go("pruefung"); },
    go,
    due: () => startRound(learnList(useProgress.getState().S, "due")),
  };
}
