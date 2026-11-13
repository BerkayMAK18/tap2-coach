import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useToast } from "@/ui";
import { createSession } from "@/lib/learn.functions";

/** Starts a LearnHarness-style tutor session (measure → plan → teach) and opens it. */
export function useTutor() {
  const create = useServerFn(createSession);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  async function start(goal: string, kind: "teach" | "practice" = "teach", options?: { topicId?: string; newConversation?: boolean }) {
    setBusy(true);
    try {
      const { id } = await create({ data: { goal, kind, ...options } });
      await qc.invalidateQueries({ queryKey: ["sessions"] });
      navigate({ to: "/session/$sessionId", params: { sessionId: id } });
    } catch (e) {
      toast({ title: "Tutor konnte nicht starten", description: e instanceof Error ? e.message : "Nochmal versuchen", variant: "error" });
    } finally {
      setBusy(false);
    }
  }
  return { start, busy };
}
