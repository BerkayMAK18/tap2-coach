import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Icon } from "@/ui";
import { Round } from "@/components/tap/Round";
import { useTutor } from "@/components/tap/useTutor";
import { buildRound, contentQuery, progressQuery, topicStats, type Item } from "@/lib/tap2";
import { PracticeLab } from '@/components/tap/PracticeLab';
import { CURRICULUM, groupOf } from '@/lib/curriculum';

export const Route = createFileRoute("/_authenticated/modul/$topicId")({
  head: () => ({
    meta: [
      { title: "Lernmodul — TAP2 Coach" },
      { name: "description", content: "Karteikarten, Auswahlfragen und offene Fragen zu einem Prüfungsthema." },
      { property: "og:title", content: "Lernmodul — TAP2 Coach" },
      { property: "og:description", content: "Karteikarten, Auswahlfragen und offene Fragen zu einem Prüfungsthema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(contentQuery()), context.queryClient.ensureQueryData(progressQuery())]),
  component: Modul,
});

function Modul() {
  const { topicId } = Route.useParams();
  const { data: content } = useSuspenseQuery(contentQuery());
  const { data: progress } = useSuspenseQuery(progressQuery());
  const navigate = useNavigate();
  const tutor = useTutor();
  const [round, setRound] = useState<Item[] | null>(null);
  const all = topicId === "alle";
  const topic = content.topics.find((t) => t.id === topicId);
  const items = useMemo(() => (all ? content.items : content.items.filter((i) => i.topic === topicId)), [content, topicId, all]);
  const stats = topicStats(items, progress);
  const name = all ? "Weiterlernen" : topic?.name ?? "Unbekanntes Thema";
  const targets = CURRICULUM.find(t => t.id === topicId);

  function startRound(filter?: (i: Item) => boolean) {
    setRound(buildRound(filter ? items.filter(filter) : items, progress));
  }

  return (
    <div className="container mx-auto w-full space-y-8 px-6 py-10 md:px-10">
      <Link to="/lernplan" className="font-text text-body-200 underline">← Lernplan</Link>
      <header className="space-y-3">
        {topic && <div className="flex gap-2"><Badge variant="brand">{groupOf(topic.part)}</Badge><Badge variant={topic.prio === "Muss" ? "accent" : "white"}>{topic.prio === 'Muss' ? 'Muss' : 'Sollte'}</Badge></div>}
        <h1 className="font-head text-heading-300">{name}</h1>
        <p className="font-text text-body-300 text-slate">
          {stats.total} Fragen · {stats.seen} gesehen · {stats.mastered} sicher ({stats.pct} %) · {stats.due} fällig
        </p>
      </header>
      {targets && !round && <div className="space-y-3"><p className="text-body-300"><strong>Muss können:</strong> {targets.must}</p><p className="text-body-300"><strong>Sollte können:</strong> {targets.should}</p></div>}

      {round ? (
        round.length ? (
          <Round items={round} progress={progress} onDone={() => setRound(null)} />
        ) : (
          <EmptyState icon={<Icon name="check-circle" size={24} />} title="Alles erledigt für heute" description="Keine fälligen oder neuen Fragen hier. Morgen geht's weiter." action={<Button variant="ink" onClick={() => setRound(null)}>Zurück</Button>} />
        )
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <Card surface="ink" size="md" className="col-span-12 space-y-4 md:col-span-6">
            <h2 className="font-head text-heading-100">Lernrunde</h2>
            <p className="font-text text-body-300">Fällige Wiederholungen zuerst, dann Neues. Höchstens 20 Fragen.</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="brand" onClick={() => startRound()}>Runde starten</Button>
              <Button variant="brand" onClick={() => startRound((i) => i.type === "card")}>Nur Karten</Button>
              <Button variant="brand" onClick={() => startRound((i) => i.type === "mc")}>Nur Auswahl</Button>
              <Button variant="brand" onClick={() => startRound((i) => i.type === "open")}>Nur offene</Button>
            </div>
          </Card>
          {!all && topic && (
            <Card surface="brand" size="md" className="col-span-12 space-y-4 md:col-span-6">
              <h2 className="font-head text-heading-100">KI-Tutor</h2>
              <p className="font-text text-body-300">Der Tutor prüft erst, was du schon kannst, plant dann den Weg und erklärt Schritt für Schritt. Was du verstanden hast, landet im Wissensgraph.</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="ink" loading={tutor.busy} onClick={() => tutor.start(`TAP2-Thema „${topic.name}“ prüfungssicher verstehen`, 'teach', { topicId })}>Mit Tutor weiterlernen</Button>
                <Button variant="ink" disabled={tutor.busy} onClick={() => tutor.start(`TAP2-Thema „${topic.name}“: Prüfungsaufgaben im IHK-Stil üben`, "practice", { topicId })}>Mit Tutor üben</Button>
              </div>
            </Card>
          )}
        </div>
      )}
      {!round && ['T01','T08','T17','T05'].includes(topicId) && <PracticeLab language="python"/>}
      {!round && ['T02','T03','T16'].includes(topicId) && <PracticeLab language="sql"/>}
      {round && <Button variant="ghost" onClick={() => { setRound(null); navigate({ to: "/modul/$topicId", params: { topicId } }); }}>Runde abbrechen</Button>}
    </div>
  );
}
