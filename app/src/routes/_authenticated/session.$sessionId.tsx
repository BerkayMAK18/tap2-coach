import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge, Breadcrumbs, Button, Icon, Label, Slider, Spinner, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Tooltip, TooltipContent, TooltipTrigger, useToast,
} from "@/ui";
import { supabase } from "@/integrations/supabase/client";
import { resumeTutor, sendTurn } from "@/lib/learn.functions";
import { graphQuery, messagesQuery, sessionQuery } from "@/lib/queries";
import { PHASE_LABEL } from '@/lib/session-history';
import type { Attachment, PlanStep, Source } from "@/lib/learn-types";
import { Markdown } from "@/components/learn/Markdown";
import { useDictation } from "@/hooks/use-dictation";
import { currentQuest, pedagogicalReply, learnerReply } from '@/lib/tutor-quest';

export const Route = createFileRoute("/_authenticated/session/$sessionId")({
  head: () => ({
    meta: [
      { title: "KI-Tutor — TAP2 Coach" },
      { name: "description", content: "Dein FIAE-Lernweg: Stand prüfen, planen, schrittweise verstehen und Erkenntnisse sichern." },
      { property: "og:title", content: "KI-Tutor — TAP2 Coach" },
      { property: "og:description", content: "Dein FIAE-Lernweg: Stand prüfen, planen, schrittweise verstehen und Erkenntnisse sichern." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(sessionQuery(params.sessionId)),
      context.queryClient.ensureQueryData(messagesQuery(params.sessionId)),
      context.queryClient.ensureQueryData(graphQuery()),
    ]),
  component: SessionPage,
});

type Pending = { content: string; thinking: string; confidence: number | null; files: File[] };

function SessionPage() {
  const { sessionId } = Route.useParams();
  const { data: session } = useSuspenseQuery(sessionQuery(sessionId));
  const { data: msgData } = useSuspenseQuery(messagesQuery(sessionId));
  const { data: graph } = useSuspenseQuery(graphQuery());
  const insights = graph.props.filter(p => p.source_session_id === sessionId);
  const quest = currentQuest(msgData.messages);
  const questMessage = msgData.messages.find(m => m.id === quest?.messageId);
  const questImages = ((questMessage?.images as string[] | null) ?? []).map(p => msgData.urls[p]).filter(Boolean);
  const qc = useQueryClient();
  const { toast } = useToast();
  const send = useServerFn(sendTurn);
  const resume = useServerFn(resumeTutor);
  const [retrying, setRetrying] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const [content, setContent] = useState("");
  const [thinking, setThinking] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const [useConfidence, setUseConfidence] = useState(false);
  const [confidence, setConfidence] = useState(3);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const dictation = useDictation((t) => setThinking((prev) => (prev ? prev + " " : "") + t));

  const plan = (session.plan as unknown as PlanStep[]) ?? [];
  const isPractice = session.kind === "practice";
  const phases = isPractice ? ['measure', 'plan', 'teach', 'practice', 'done'] : ['measure', 'plan', 'teach', 'done'];
  const awaitingReply = !msgData.messages.length || msgData.messages.at(-1)?.role === 'user';

  useEffect(() => {
    const timer = setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' }), 100);
    return () => clearTimeout(timer);
  }, [msgData.messages.length, pending]);
  useEffect(() => {
    if (!pending) inputRef.current?.focus({ preventScroll: true });
  }, [pending, sessionId]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!content.trim() || pending) return;
    const p: Pending = { content, thinking: showThinking ? thinking : "", confidence: useConfidence ? confidence : null, files };
    setPending(p);
    setContent("");
    setThinking("");
    setFiles([]);
    try {
      const { data: u } = await supabase.auth.getUser();
      const attachments: Attachment[] = [];
      for (const f of p.files) {
        if (!u.user) throw new Error('Melde dich erneut an, um Dateien zu senden.');
        const path = `${u.user.id}/${sessionId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("attachments").upload(path, f, { contentType: f.type || "application/octet-stream" });
        if (error) throw new Error(`Upload failed for ${f.name}`);
        attachments.push({ path, name: f.name, type: f.type || "application/octet-stream" });
      }
      const result = await send({ data: { sessionId, content: p.content, thinking: p.thinking, confidence: p.confidence, attachments } });
      setSavedCount(result.graphCount);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["messages", sessionId] }),
        qc.invalidateQueries({ queryKey: ["session", sessionId] }),
        qc.invalidateQueries({ queryKey: ["graph"] }),
        qc.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
    } catch (err) {
      const fresh = await qc.fetchQuery(messagesQuery(sessionId)).catch(() => null);
      if (fresh?.messages.at(-1)?.content !== p.content) {
        setContent(p.content); setThinking(p.thinking); setFiles(p.files);
      }
      toast({ title: "Tutor konnte nicht antworten", description: 'Deine gespeicherte Antwort kannst du erneut prüfen lassen.', variant: "error" });
    } finally {
      setPending(null);
    }
  }

  async function retry() {
    setRetrying(true);
    try {
      const result = await resume({ data: { sessionId } });
      setSavedCount(result.graphCount);
      await Promise.all([qc.invalidateQueries({ queryKey: ['messages', sessionId] }), qc.invalidateQueries({ queryKey: ['session', sessionId] }), qc.invalidateQueries({ queryKey: ['graph'] })]);
    } catch {
      toast({ title: 'Tutor konnte nicht antworten', description: 'Deine Antwort bleibt gespeichert.', variant: 'error' });
    } finally { setRetrying(false); }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) setFiles((f) => [...f, ...Array.from(e.dataTransfer.files)].slice(0, 6));
  }

  const phaseIdx = phases.indexOf(session.phase);

  return (
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-12 gap-8 px-4 py-6 md:gap-10 md:px-6">
      {/* Conversation */}
      <section className="col-span-12 flex min-w-0 flex-col gap-6 md:col-span-7" aria-label="Lerngespräch">
        <div className="space-y-3">
          <Breadcrumbs items={[{ label: "Gespräche", href: "/verlauf" }, { label: session.title }]} renderLink={({ className, children }) => <Link to="/verlauf" className={className}>{children}</Link>} />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-head text-heading-100">{session.title}</h1>
            <Badge variant={isPractice ? "accent" : "brand"}>{PHASE_LABEL[session.phase]}</Badge>
          </div>
          {savedCount !== null && <p className="text-body-200" role="status">{savedCount > 0 ? `${savedCount} neue Erkenntnisse gespeichert.` : 'Antwort geprüft. Noch keine neuen Erkenntnisse nachgewiesen.'}</p>}
        </div>

        <div className="border-b-2 border-border pb-4 pt-3">
          <h2 className="font-head text-body-400">Chat mit dem Tutor</h2>
        </div>
        <div className="flex flex-1 flex-col gap-6" aria-live="polite">
          {msgData.messages.map((m) =>
            m.role === "assistant" ? (
              <AssistantMessage
                key={m.id}
                content={pedagogicalReply(m.content)}
                images={[]}
                demo={m.demo_html}
                sources={(m.sources as unknown as Source[]) ?? []}
              />
            ) : (
              <UserMessage
                key={m.id}
                content={learnerReply(m.content)}
                thinking={m.thinking}
                confidence={m.confidence}
                attachments={(m.attachments as unknown as Attachment[]) ?? []}
                urls={msgData.urls}
              />
            ),
          )}
          {pending && (
            <>
              <UserMessage content={pending.content} thinking={pending.thinking} confidence={pending.confidence} attachments={pending.files.map((f) => ({ path: "", name: f.name, type: f.type }))} urls={{}} />
              <div className="flex items-center gap-3 text-ink" role="status">
                <Spinner size="sm" label="Tutor prüft deine Antwort" />
                <span className="font-text text-body-200">{pending.files.length ? "Dateien und Antwort prüfen…" : "Antwort prüfen und nächsten Schritt planen…"}</span>
              </div>
            </>
          )}
          <div ref={endRef} />
          {awaitingReply && !pending && <Button variant="ink" onClick={retry} loading={retrying}>Gespeicherte Antwort erneut prüfen</Button>}
        </div>

        {/* Composer */}
        <form
          onSubmit={submit}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`space-y-4 rounded-sm border-2 bg-white p-4 ${dragging ? "border-highlight" : "border-ink"}`}
        >
          <div className="space-y-2">
            <Label htmlFor="answer">Deine Antwort oder Frage</Label>
            <Textarea id="answer" ref={inputRef} rows={3} value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={onKey} placeholder="Deine Antwort…" disabled={!!pending || retrying || awaitingReply} />
          </div>

          {showThinking && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="thinking">Dein Gedankengang (optional)</Label>
                {dictation.supported && (
                  <Button type="button" variant={dictation.listening ? "solid" : "ghost"} size="sm" onClick={dictation.toggle} aria-pressed={dictation.listening}>
                    <Icon name="microphone" size={16} /> {dictation.listening ? "Diktat stoppen" : "Diktieren"}
                  </Button>
                )}
              </div>
              <Textarea id="thinking" rows={2} value={thinking} onChange={(e) => setThinking(e.target.value)} placeholder="Wie bist du auf deine Antwort gekommen?" disabled={!!pending} />
            </div>
          )}

          {useConfidence && (
            <div className="space-y-2">
              <Label id="conf-label">Wie sicher bist du? {confidence}/5</Label>
              <Slider min={1} max={5} step={1} value={[confidence]} onValueChange={(v) => setConfidence(v[0])} aria-labelledby="conf-label" />
            </div>
          )}

          {files.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Angehängte Dateien">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  <Badge variant="white">
                    {f.name}
                    <Button variant="ghost" size="icon" type="button" aria-label={`${f.name} entfernen`} onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}>
                      <Icon name="close" size={16} />
                    </Button>
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,.txt,.md,.csv,.json" className="sr-only" onChange={(e) => { const selected = e.target.files; if (selected) setFiles((f) => [...f, ...Array.from(selected)].slice(0, 6)); e.target.value = ""; }} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                    Datei anhängen
                  </Button>
                </TooltipTrigger>
                <TooltipContent>PDFs, Bilder oder Notizen anhängen</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2">
                <Switch id="sw-think" checked={showThinking} onCheckedChange={setShowThinking} />
                <Label htmlFor="sw-think">Gedankengang</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="sw-conf" checked={useConfidence} onCheckedChange={setUseConfidence} />
                <Label htmlFor="sw-conf">Sicherheit</Label>
              </div>
            </div>
            <Button type="submit" variant="solid" loading={!!pending} disabled={!content.trim() || retrying || awaitingReply}>
              Senden
            </Button>
          </div>
        </form>
      </section>

      {/* Plan & learner picture */}
      <aside className="order-first col-span-12 w-full min-w-0 self-start bg-white p-4 md:sticky md:top-6 md:order-last md:col-span-5 md:p-6" aria-label="Dein Lernweg und deine Aufgabe">
          <Tabs defaultValue="quest">
            <TabsList>
              <TabsTrigger value="quest">Aufgabenstellung</TabsTrigger>
              <TabsTrigger value="stand">Dein Stand</TabsTrigger>
            </TabsList>
            <TabsContent value="quest" className="max-h-[calc(100vh-var(--space-20)-var(--space-6))] min-w-0 overflow-y-auto">
              <section className="min-w-0 space-y-4 break-words">
                <h2 className="font-head text-heading-100">Aktuelle Aufgabe</h2>
                {quest ? <>
                  <Markdown>{quest.task}</Markdown>
                  {quest.material && <div className="space-y-3 border-t border-border pt-4"><h3 className="font-head text-body-400">Ausgangsmaterial</h3><Markdown>{quest.material}</Markdown></div>}
                  {questImages.map(src => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="Diagramm zur aktuellen Aufgabe" width={1024} height={1024} className="w-full" /></a>)}
                  {pending && <p className="text-body-200">Deine Antwort wird geprüft. Die Aufgabe bleibt hier stehen.</p>}
                </> : <p className="text-body-200">Die erste Aufgabe erscheint mit der Tutorantwort.</p>}
              </section>
            </TabsContent>
            <TabsContent value="stand" className="max-h-[calc(100vh-var(--space-20)-var(--space-6))] min-w-0 overflow-y-auto">
              <div className="space-y-6">
          {(
            <section className="space-y-4 border-b border-border pb-4">
              <h2 className="font-head text-heading-100">Dein Stand</h2>
              <ol className="flex flex-wrap gap-2">
                {phases.map((p, i) => (
                  <li key={p}>
                    <Badge variant={i < phaseIdx ? "success" : i === phaseIdx ? "ink" : "white"}>{PHASE_LABEL[p]}</Badge>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(
            <section className="space-y-4">
              <h2 className="font-head text-heading-100">Dein Lernweg</h2>
              {plan.length === 0 ? (
                <p className="font-text text-body-200 text-slate">Zuerst prüfen wir deine Grundlagen. Daraus entsteht dein Lernweg.</p>
              ) : (
                <ol className="space-y-3">
                  {plan.map((step, i) => {
                    const state = session.phase === "done" || i < session.current_step ? "done" : i === session.current_step ? "now" : "later";
                    return (
                      <li key={i} className={`border-l-2 pl-3 ${state === "now" ? "border-ink" : state === "done" ? "border-highlight" : "border-sand"}`} aria-current={state === "now" ? "step" : undefined}>
                        <p className={`font-text text-body-200 ${state === "now" ? "font-bold" : "font-medium"} ${state === "later" ? "text-slate" : ""}`}>
                          {i + 1}. {step.title}
                          {state === "done" && <span className="sr-only"> (abgeschlossen)</span>}
                        </p>
                        {state === 'now' && <p className="font-text text-body-200 text-slate">{step.description}</p>}
                        {step.depends_on.length > 0 && <p className="font-text text-body-100 text-slate">Baut auf Schritt {step.depends_on.map((d) => d + 1).join(", ")} auf</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}

          <section className="space-y-3 border-t border-border pt-4"><h2 className="font-head text-heading-100">Wissensgraph</h2><p className="text-body-200">{insights.length} Erkenntnisse aus diesem Gespräch</p><ul className="space-y-3">{insights.slice(-4).map(p => <li key={p.id} className="text-body-200">{p.statement}</li>)}</ul><Button asChild><Link to="/graph">Zusammenhänge öffnen</Link></Button></section>
          <Accordion type="single" collapsible><AccordionItem value="details"><AccordionTrigger>Lernziel und bisheriger Stand</AccordionTrigger><AccordionContent><div className="space-y-3"><p className="break-words text-body-200">{session.goal}</p>{session.learner_model && <p className="text-body-200">{session.learner_model}</p>}</div></AccordionContent></AccordionItem></Accordion>
              </div>
            </TabsContent>
          </Tabs>
      </aside>
    </div>
  );
}

function AssistantMessage({ content, images, demo, sources }: { content: string; images: string[]; demo: string | null; sources: Source[] }) {
  const [showDemo, setShowDemo] = useState(true);
  return (
    <article className="max-w-3xl space-y-4">
      <Markdown>{content}</Markdown>
      {images.map((src) => (
        <img key={src} src={src} alt="Diagramm zu diesem Lernschritt" loading="lazy" width={1024} height={1024} className="w-full max-w-lg rounded-sm border-2 border-ink" />
      ))}
      {demo && (
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => setShowDemo((s) => !s)}>
            {showDemo ? "Beispiel ausblenden" : "Beispiel zeigen"}
          </Button>
          {showDemo && <iframe title="Interaktives Lernbeispiel" sandbox="allow-scripts" srcDoc={demo} className="h-96 w-full rounded-sm border-2 border-ink bg-white" />}
        </div>
      )}
      {sources.length > 0 && (
        <div className="space-y-1">
          <p className="font-text text-body-100 font-bold text-slate">Quellen</p>
          <ul className="space-y-1">
            {sources.slice(0, 6).map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="font-text text-body-200 text-ink underline">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function UserMessage({ content, thinking, confidence, attachments, urls }: { content: string; thinking: string | null; confidence: number | null; attachments: Attachment[]; urls: Record<string, string> }) {
  return (
    <article className="ml-auto max-w-2xl space-y-2 rounded-sm bg-ink p-4 text-brand">
      <p className="whitespace-pre-wrap font-text text-body-300">{content}</p>
      {thinking && (
        <p className="whitespace-pre-wrap border-l-2 border-brand pl-3 font-text text-body-200 italic opacity-90">
          <span className="sr-only">Mein Gedankengang: </span>
          {thinking}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {confidence != null && <Badge variant="brand">Sicherheit {confidence}/5</Badge>}
        {attachments.map((a) =>
          a.type.startsWith("image/") && urls[a.path] ? (
            <img key={a.path} src={urls[a.path]} alt={a.name} className="h-20 rounded-sm border-2 border-brand" />
          ) : (
            <Badge key={a.name + a.path} variant="brand">{a.name}</Badge>
          ),
        )}
      </div>
    </article>
  );
}
