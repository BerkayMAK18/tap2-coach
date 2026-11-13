import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Label, Textarea } from '@/ui';
import { useTutor } from '@/components/tap/useTutor';
import { sessionsQuery } from '@/lib/queries';
import { contentQuery, progressQuery } from '@/lib/tap2';
import { learningPlan } from '@/lib/curriculum';

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({ meta: [
    { title: 'Tutor — TAP2 Coach' },
    { name: 'description', content: 'Setze deinen Lernweg mit dem Tutor fort und finde dein belegtes Wissen.' },
    { property: 'og:title', content: 'Tutor — TAP2 Coach' },
    { property: 'og:description', content: 'Dein KI-Tutor und passende Themen für die FIAE-Prüfung.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(sessionsQuery()),
    context.queryClient.ensureQueryData(contentQuery()), context.queryClient.ensureQueryData(progressQuery()),
  ]),
  component: TutorHome,
});

function TutorHome() {
  const { data: content } = useSuspenseQuery(contentQuery());
  const { data: progress } = useSuspenseQuery(progressQuery());
  const tutor = useTutor();
  const [goal, setGoal] = useState('');
  const plan = learningPlan(content, progress);
  const next = plan.ordered.find(t => t.stats.pct < 80 || t.stats.due > 0) ?? plan.ordered[0];
  function ask(e: FormEvent) { e.preventDefault(); if (goal.trim()) tutor.start(goal.trim(), 'teach'); }
  return <div className="container mx-auto w-full space-y-8 px-6 py-8 md:px-10">
    <header className="space-y-2"><h1 className="font-head text-heading-300">Dein Tutor</h1><p className="text-body-200 text-slate">FIAE · Prüfung am 25.11.2026</p></header>
    <form onSubmit={ask} className="space-y-4"><Label htmlFor="goal">Was möchtest du verstehen?</Label><Textarea id="goal" rows={4} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Zum Beispiel: Normalisierung bis zur 3. Normalform" /><Button variant="solid" type="submit" loading={tutor.busy} disabled={!goal.trim()}>Mit Tutor lernen</Button></form>
    <section className="space-y-4 border-t border-border pt-8"><h2 className="font-head text-heading-100">Was du lernen kannst</h2><div className="flex flex-wrap gap-3">{plan.ordered.slice(0, 6).map(t => <Button key={t.id} loading={tutor.busy} onClick={() => tutor.start(`FIAE ${t.name}: Prüfe zuerst meinen Stand. Muss-Ziele: ${t.must}`, 'teach', { topicId: t.id })}>{t.name}</Button>)}</div>{next && <p className="text-body-200 text-slate">Empfohlen nach deinem Stand: {next.name}</p>}<Button asChild variant="ghost"><Link to="/lernplan">Alle Lernquellen</Link></Button></section>
  </div>;
}
