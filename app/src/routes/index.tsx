/** Übersicht: Countdown, Prüfungsreife je Prüfungsteil, fällige Fragen, nächstes Thema – wie die Startseite der Live-App. */
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Flame, RotateCcw } from "lucide-react";
import { Button, Card, CardEyebrow, Progress } from "@/ui";
import { TOPICS, allQ, inTeil, topicQ } from "@/content/catalog";
import { EXAM_DAY, EXAM_DE } from "@/config";
import { daysBetween, today } from "@/lib/dates";
import { counts, dueList, reifeLabel } from "@/lib/srs";
import { useProgress } from "@/store/progress";

export const Route = createFileRoute("/")({ component: Start });

const PARTS = [["t1", "Teil 1"], ["t2", "Teil 2"], ["wiso", "WiSo"]] as const;

function Start() {
  const { S, startSession } = useProgress();
  const navigate = useNavigate();
  const all = allQ(S), c = counts(S, all), due = dueList(S, all), left = daysBetween(today(), EXAM_DAY), todayN = S.log[today()] || 0;
  // Nächstes Thema: Muss-Themen zuerst, dann geringste Reife
  const next = TOPICS.map((t) => ({ t, c: counts(S, topicQ(S, t.id)) })).sort((a, b) => (a.t.prio === "Muss" ? 0 : 1) - (b.t.prio === "Muss" ? 0 : 1) || a.c.pct - b.c.pct)[0];
  const startDue = () => { startSession("Fällige Wiederholungen", due.slice(0, 30).map((q) => q.id)); navigate({ to: "/lernen/runde" }); };

  return (
    <div className="space-y-6">
      <Card surface="ink" size="lg" className="space-y-4">
        <CardEyebrow>{left > 0 ? `Noch ${left} ${left === 1 ? "Tag" : "Tage"} bis zur TAP2 am ${EXAM_DE}` : `TAP2 am ${EXAM_DE}`}</CardEyebrow>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="font-head text-heading-500">{Math.round(c.pct * 100)} %</p>
          <p className="pb-2 text-body-400 opacity-80">{reifeLabel(c.pct)} · {c.g} grün, {c.y} gelb, {c.r} rot, {c.n} neu</p>
        </div>
        <Progress value={c.pct * 100} className="bg-white/20" />
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="solid" disabled={!due.length} onClick={startDue}><RotateCcw className="h-4 w-4" /> {due.length ? `${due.length} fällige wiederholen` : "Heute nichts fällig"}</Button>
          <Button variant="ghost" className="border border-white/40 bg-transparent text-canvas hover:bg-white/10 hover:text-canvas" asChild><Link to="/lernen">Themen ansehen</Link></Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {PARTS.map(([p, label]) => {
          const ids = new Set(TOPICS.filter((t) => inTeil(t, p)).map((t) => t.id)), pc = counts(S, all.filter((q) => ids.has(q.topic)));
          return (
            <Card key={p} className="space-y-2">
              <CardEyebrow>{label}</CardEyebrow>
              <p className="font-head text-heading-200">{Math.round(pc.pct * 100)} %</p>
              <Progress value={pc.pct * 100} />
              <p className="text-body-200 text-slate">{pc.g} von {pc.t} grün</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {next && (
          <Card className="space-y-3">
            <CardEyebrow>Als Nächstes</CardEyebrow>
            <p className="font-head text-heading-100">{next.t.n}</p>
            <p className="text-body-200 text-slate">{next.t.teil}{next.t.prio === "Muss" ? " · Muss" : ""} · {Math.round(next.c.pct * 100)} % · {next.c.open} offen</p>
            <Button variant="ink" asChild><Link to="/lernen" search={{ thema: next.t.id }}>Thema öffnen <ArrowRight className="h-4 w-4" /></Link></Button>
          </Card>
        )}
        <Card className="space-y-3">
          <CardEyebrow>Heute</CardEyebrow>
          <p className="flex items-center gap-2 font-head text-heading-100"><Flame className="h-5 w-5 text-tone-warning-main" aria-hidden="true" />{todayN} {todayN === 1 ? "Antwort" : "Antworten"}</p>
          <p className="text-body-200 text-slate">Zielwert: Fällige erledigen und täglich ein Thema weiterbringen.</p>
        </Card>
      </div>
    </div>
  );
}
