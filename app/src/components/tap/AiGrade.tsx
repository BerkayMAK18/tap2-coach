import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, useToast } from "@/ui";
import { gradeAnswer } from "@/lib/learn.functions";
import { Markdown } from "@/components/learn/Markdown";

export function AiGrade({ question, solution, answer, points, itemId, practiceKey }: { question: string; solution: string; answer: string; points: number; itemId?: string; practiceKey?: string }) {
  const grade = useServerFn(gradeAnswer);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const [result, setResult] = useState<{ feedback: string; sessionId: string; graphCount: number; answer: string } | null>(null);
  const currentResult = result?.answer === answer ? result : null;
  async function run() {
    setBusy(true);
    try {
      const r = await grade({ data: { question, solution, answer, points, itemId, practiceKey } });
      setResult({ ...r, answer });
      await Promise.all([qc.invalidateQueries({ queryKey: ['graph'] }), qc.invalidateQueries({ queryKey: ['sessions'] })]);
    } catch {
      toast({ title: "Bewertung fehlgeschlagen", description: 'Deine Antwort bleibt erhalten. Versuche die Bewertung erneut.', variant: "error" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <Button variant="ink" size="sm" onClick={run} loading={busy} disabled={!answer.trim() || !!currentResult}>
        {busy ? "Prüfer liest…" : "KI bewerten lassen"}
      </Button>
      {currentResult && <Card surface="white" size="sm">
        <div className="space-y-4">
          <Markdown>{currentResult.feedback}</Markdown>
          <p className="text-body-200">{currentResult.graphCount > 0 ? `${currentResult.graphCount} neue Erkenntnisse im Wissensgraph gespeichert.` : 'Bewertung gespeichert. Noch keine neuen Erkenntnisse nachgewiesen.'}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="solid"><Link to="/session/$sessionId" params={{ sessionId: currentResult.sessionId }}>Lernweg mit Tutor starten</Link></Button>
            <Button asChild variant="ink"><Link to="/graph">Wissensgraph öffnen</Link></Button>
          </div>
        </div>
      </Card>}
    </div>
  );
}
