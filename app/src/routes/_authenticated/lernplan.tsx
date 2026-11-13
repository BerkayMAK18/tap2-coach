import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { learningSourcesQuery } from "@/lib/learning-sources";
import { saveLearningSource } from "@/lib/learning-sources.functions";
import { Markdown } from "@/components/learn/Markdown";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge, Button, Progress, Input, Label, Textarea, FileUpload, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, ConfirmDialog, useToast } from "@/ui";
import { useTutor } from "@/components/tap/useTutor";
import { contentQuery, progressQuery } from "@/lib/tap2";
import { learningPlan, PARTS } from "@/lib/curriculum";
export const Route = createFileRoute("/_authenticated/lernplan")({
  head: () => ({
    meta: [
      { title: "Lernquellen — TAP2 Coach" },
      { name: "description", content: "Deine FIAE-Themen, Lernmaterialien und privaten Texte und Dateien für den Tutor." },
      { property: "og:title", content: "Lernquellen — TAP2 Coach" },
      { property: "og:description", content: "Deine FIAE-Themen, Lernmaterialien und privaten Texte und Dateien für den Tutor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(contentQuery()),
      context.queryClient.ensureQueryData(progressQuery()),
      context.queryClient.ensureQueryData(learningSourcesQuery()),
    ]),
  component: Dashboard,
});

function Dashboard() {
  const { data: content } = useSuspenseQuery(contentQuery());
  const { data: progress } = useSuspenseQuery(progressQuery());
  const plan = learningPlan(content, progress);
  const tutor = useTutor();
  const { data: sources } = useSuspenseQuery(learningSourcesQuery());
  const qc = useQueryClient();
  const save = useServerFn(saveLearningSource);
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('general');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    let path: string | null = null;
    try {
      const file = files[0];
      let body = text.trim();
      if (file) {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error('Melde dich erneut an.');
        path = `${auth.user.id}/sources/${crypto.randomUUID()}`;
        const { error } = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type || 'text/plain' });
        if (error) throw error;
        if (/\.(txt|md|csv|json)$/i.test(file.name)) body = [body, await file.text()].filter(Boolean).join('\n\n');
      }
      await save({ data: { title: title.trim() || file?.name || 'Eigener Text', topic_id: topic === 'general' ? null : topic, content: body, file_path: path, file_name: file?.name ?? null, file_type: file?.type || (file ? 'text/plain' : null) } });
      setTitle(''); setText(''); setFiles([]);
      await qc.invalidateQueries({ queryKey: ['learning-sources'] });
      toast({ title: 'Lernquelle gespeichert', variant: 'success' });
    } catch (error) {
      if (path) await supabase.storage.from('attachments').remove([path]);
      toast({ title: 'Lernquelle nicht gespeichert', description: error instanceof Error ? error.message : 'Versuche es erneut.', variant: 'error' });
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!removeId) return;
    const { error } = await supabase.from('learning_sources').delete().eq('id', removeId);
    if (error) throw error;
    setRemoveId(null); await qc.invalidateQueries({ queryKey: ['learning-sources'] });
  }
  return <div className="container mx-auto w-full space-y-8 px-6 py-8 md:px-10">
    <header className="space-y-4">
      <p className="font-text text-body-200">Fachinformatiker/in Anwendungsentwicklung · Prüfung am 25.11.2026 · {plan.remaining > 0 ? `noch ${plan.remaining} Tage` : "Prüfungstermin erreicht"}</p>
      <h1 className="font-head text-heading-300">Lernquellen</h1>
      <p className="text-body-300">FIAE-Themen und eigene Unterlagen. Quellen sind Lernmaterial — dein nachgewiesenes Verständnis findest du im Wissensgraph.</p>
    </header>
    <section className="space-y-4"><h2 className="font-head text-heading-100">Deine Unterlagen</h2>
      <Accordion type="single" collapsible><AccordionItem value="add"><AccordionTrigger>Lernquelle hinzufügen</AccordionTrigger><AccordionContent><form onSubmit={add} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="source-title">Titel</Label><Input id="source-title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="source-topic">Thema</Label><Select value={topic} onValueChange={setTopic}><SelectTrigger id="source-topic"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">Allgemein</SelectItem>{content.topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="source-text">Text</Label><Textarea id="source-text" rows={6} maxLength={40000} value={text} onChange={e => setText(e.target.value)} /></div>
        <FileUpload value={files} onFilesChange={setFiles} accept=".pdf,.txt,.md,.csv,.json" maxSize={10 * 1024 * 1024} label="Datei auswählen" hint="PDF, TXT, Markdown, CSV oder JSON · bis 10 MB" disabled={busy} />
        <Button type="submit" variant="solid" loading={busy} disabled={!text.trim() && !files.length}>Quelle speichern</Button>
      </form></AccordionContent></AccordionItem></Accordion>
      {sources.length ? sources.map(source => <Accordion key={source.id} type="single" collapsible><AccordionItem value={source.id}><AccordionTrigger>{source.title} · {content.topics.find(t => t.id === source.topic_id)?.name ?? 'Allgemein'}</AccordionTrigger><AccordionContent><div className="space-y-4">{source.content && <Markdown>{source.content}</Markdown>}{source.file_name && <p className="text-body-200">Datei: {source.file_name}</p>}<Button variant="ghost" onClick={() => setRemoveId(source.id)}>Quelle entfernen</Button></div></AccordionContent></AccordionItem></Accordion>) : <p className="text-body-200 text-slate">Noch keine eigenen Unterlagen.</p>}
    </section>
    <section className="space-y-4 border-t border-border pt-6"><h2 className="font-head text-heading-100">FIAE-Wissensbasis</h2><p className="text-body-200 text-slate">19 Themen · {content.items.length} Lernkarten und Fragen · Muss- und Sollte-Ziele. Kein vollständiges Verzeichnis des Modellwissens und keine Garantie für den Prüfungsumfang.</p></section>
    {PARTS.map(part=><section key={part} className="space-y-4">
      <h2 className="font-head text-heading-100">{part}</h2>
      <div className="space-y-6">{plan.topics.filter(t=>t.group===part).map(t=><Accordion type="single" collapsible key={t.id}><AccordionItem value={t.id}><AccordionTrigger><span>{t.name} · {t.status}</span></AccordionTrigger><AccordionContent><div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-text text-body-400 font-medium">{t.name}</h3><Badge variant={t.prio==='Muss'?'accent':'white'}>{t.prio==='Muss'?'Muss · zuerst':'Sollte · danach'}</Badge></div>
        <p className="text-body-300"><strong>Muss können:</strong> {t.must}</p>
        <p className="text-body-300"><strong>Sollte können:</strong> {t.should}</p>
        <div className="flex flex-wrap items-center gap-3"><Progress value={t.stats.pct} aria-label={`${t.name}: ${t.stats.pct} Prozent gefestigt`} className="flex-1"/><span className="text-body-200">{t.status} · {t.stats.mastered}/{t.stats.total} gefestigt · {t.stats.due} fällig</span></div>
        <div className="flex flex-wrap gap-3"><Button asChild><Link to="/modul/$topicId" params={{topicId:t.id}}>Thema lernen</Link></Button><Button variant="ghost" disabled={tutor.busy} onClick={()=>tutor.start(`FIAE Lernstand diagnostizieren: ${t.name}. ${t.stats.seen===0?'Noch kein belegter Lernstand.':`${t.stats.seen} Fragen gesehen, ${t.stats.mastered} gefestigt, ${t.wrong} Fehler.`} Muss-Ziele: ${t.must}. Stelle zuerst eine Diagnosefrage, dann einen Lernpfad mit Voraussetzungen. Python für Code, SQL für Datenbanken.`, 'teach', { topicId: t.id })}>Mit Tutor weiterlernen</Button></div>
      </div></AccordionContent></AccordionItem></Accordion>)}</div>
    </section>)}
    <ConfirmDialog open={!!removeId} onOpenChange={open => { if (!open) setRemoveId(null); }} title="Quelle entfernen?" description="Diese Quelle wird nicht mehr für neue Tutor-Antworten verwendet. Deine Gespräche und Erkenntnisse bleiben erhalten." confirmLabel="Entfernen" cancelLabel="Abbrechen" tone="danger" onConfirm={remove} />
  </div>;
}
