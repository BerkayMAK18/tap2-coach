/**
 * Lernen: Schnellstarts (fällig, Fehler, markiert, Zufall), Themen nach Prüfungsteil, Mehrfachauswahl
 * und Themenseite mit Theorie aus den Lernpaketen. Runden-Logik wie in der Live-App (srs.ts).
 */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Play, RotateCcw, Shuffle, Star, XCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge, Button, Card, CardEyebrow, Progress } from "@/ui";
import { TAP2, TOPICS, TP, allQ, inTeil, topicQ } from "@/content/catalog";
import type { Question } from "@/content/schema";
import { shuffle } from "@/lib/dates";
import { ROUND, counts, dueList, mixIn, openOrder, st } from "@/lib/srs";
import { useProgress } from "@/store/progress";
import { cn } from "@/lib/utils";

const search = z.object({ thema: z.string().optional(), teil: z.enum(["alle", "t1", "t2", "wiso"]).optional() });
export const Route = createFileRoute("/lernen/")({ validateSearch: search, component: Lernen });

function Lernen() {
  const { thema, teil = "alle" } = Route.useSearch();
  const navigate = useNavigate({ from: "/lernen/" });
  const { S, startSession } = useProgress();
  const [sel, setSel] = useState<string[]>([]);
  const all = allQ(S);
  const go = (title: string, qs: Question[]) => { if (!qs.length) return; startSession(title, qs.map((q) => q.id)); navigate({ to: "/lernen/runde" }); };

  if (thema && TP[thema]) return <TopicPage tid={thema} onBack={() => navigate({ search: { teil } })} go={go} />;

  const topics = TOPICS.filter((t) => teil === "alle" || inTeil(t, teil));
  const marked = all.filter((q) => S.mark[q.id]), errors = all.filter((q) => st(S, q.id) === 0), due = dueList(S, all);
  const selQ = () => all.filter((q) => sel.includes(q.topic));

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <CardEyebrow>Gesamter Fragenkatalog</CardEyebrow>
        <Overview qs={all} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!due.length} onClick={() => go("Fällige Wiederholungen", due.slice(0, ROUND))}><RotateCcw className="h-4 w-4" />Fällig ({due.length})</Button>
          <Button size="sm" variant="outline" disabled={!errors.length} onClick={() => go("Fehlerfragen", shuffle(errors.slice()))}><XCircle className="h-4 w-4" />Fehler ({errors.length})</Button>
          <Button size="sm" variant="outline" disabled={!marked.length} onClick={() => go("Markierte Fragen", shuffle(marked.slice()))}><Star className="h-4 w-4" />Markiert ({marked.length})</Button>
          <Button size="sm" variant="outline" onClick={() => go("Zufallsrunde", shuffle(all.slice()).slice(0, ROUND))}><Shuffle className="h-4 w-4" />Zufall</Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-heading-100">Themen</h2>
        <div className="ml-auto flex rounded-full border bg-card p-1" role="tablist" aria-label="Prüfungsteil">
          {([["alle", "Alle"], ["t1", "Teil 1"], ["t2", "Teil 2"], ["wiso", "WiSo"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={teil === k} onClick={() => navigate({ search: { teil: k } })} className={cn("rounded-full px-3 py-1 text-body-200", teil === k ? "bg-ink text-canvas" : "text-slate hover:text-ink")}>{l}</button>
          ))}
        </div>
      </div>
      <p className="text-body-200 text-slate">Tipp: Hake mehrere Themen an, um sie gemeinsam in einer Runde zu üben.</p>

      <ul className="space-y-2">
        {topics.map((t) => {
          const c = counts(S, topicQ(S, t.id)), on = sel.includes(t.id);
          return (
            <li key={t.id} className="flex items-stretch gap-2">
              <label className="flex items-center rounded-lg border bg-card px-3" title="Für eine gemeinsame Runde auswählen">
                <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--ink))]" checked={on} onChange={() => setSel(on ? sel.filter((x) => x !== t.id) : [...sel, t.id])} aria-label={`${t.n} auswählen`} />
              </label>
              <button onClick={() => navigate({ search: { thema: t.id, teil } })} className="flex flex-1 items-center gap-4 rounded-lg border bg-card px-4 py-3 text-left hover:border-ink/30">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t.n}</span>
                  <span className="block text-body-200 text-slate">{t.teil} · {c.t} Fragen{t.prio === "Muss" ? " · Muss" : ""}</span>
                  <Progress value={c.pct * 100} className="mt-2 h-1.5" />
                </span>
                <span className="font-head text-heading-100 tabular-nums">{Math.round(c.pct * 100)} %</span>
              </button>
            </li>
          );
        })}
      </ul>

      {sel.length > 0 && (
        <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-overlay md:bottom-6">
          <span className="text-body-300">{sel.length} {sel.length === 1 ? "Thema" : "Themen"} ausgewählt</span>
          <Button size="sm" variant="ink" className="ml-auto" onClick={() => go("Auswahl: " + sel.map((id) => TP[id].n).join(", "), mixIn(S, openOrder(S, selQ()), all, sel))}><Play className="h-4 w-4" />Runde starten</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel([])}>Abwählen</Button>
        </div>
      )}
    </div>
  );
}

function Overview({ qs }: { qs: Question[] }) {
  const S = useProgress((s) => s.S), c = counts(S, qs);
  return (
    <div className="space-y-2">
      <p className="font-head text-heading-200">{c.t} Fragen · {Math.round(c.pct * 100)} % prüfungsreif</p>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${c.g} grün, ${c.y} gelb, ${c.r} rot, ${c.n} neu`}>
        <i className="bg-tone-success-main" style={{ width: `${(c.g / (c.t || 1)) * 100}%` }} />
        <i className="bg-tone-yellow-main" style={{ width: `${(c.y / (c.t || 1)) * 100}%` }} />
        <i className="bg-tone-error-main" style={{ width: `${(c.r / (c.t || 1)) * 100}%` }} />
      </div>
      <p className="text-body-200 text-slate">{c.g} grün · {c.y} gelb · {c.r} rot · {c.n} neu</p>
    </div>
  );
}

function TopicPage({ tid, onBack, go }: { tid: string; onBack: () => void; go: (title: string, qs: Question[]) => void }) {
  const S = useProgress((s) => s.S), t = TP[tid], qs = topicQ(S, tid), all = allQ(S);
  const pakete = TAP2.pakete.filter((p) => t.th.includes(p.id));
  const errors = qs.filter((q) => st(S, q.id) === 0), due = dueList(S, qs), neu = qs.filter((q) => st(S, q.id) === -1);
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" />Alle Themen</Button>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2"><CardEyebrow>{t.teil}</CardEyebrow>{t.prio === "Muss" && <Badge>Muss</Badge>}</div>
        <h1 className="text-heading-300">{t.n}</h1>
        <Overview qs={qs} />
        <div className="flex flex-wrap gap-2">
          <Button variant="ink" onClick={() => go(t.n, mixIn(S, openOrder(S, qs), all, [tid]))}><Play className="h-4 w-4" />Lernrunde</Button>
          <Button variant="outline" disabled={!due.length} onClick={() => go(t.n + " · Fällige", due.slice(0, ROUND))}>Fällig ({due.length})</Button>
          <Button variant="outline" disabled={!errors.length} onClick={() => go(t.n + " · Fehler", shuffle(errors.slice()))}>Fehler ({errors.length})</Button>
          <Button variant="outline" disabled={!neu.length} onClick={() => go(t.n + " · Neue", shuffle(neu.slice()).slice(0, ROUND))}>Nur neue ({neu.length})</Button>
        </div>
      </Card>
      {pakete.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-heading-100">Theorie</h2>
          {pakete.map((p) => (
            <Card key={p.id} className="space-y-2">
              <p className="font-head text-heading-100">{p.titel}</p>
              {p.relevanz && <p className="text-body-200 text-slate">{p.relevanz}</p>}
              <Accordion type="multiple">
                {p.kern.map(([titel, text, code], i) => (
                  <AccordionItem key={i} value={String(i)}>
                    <AccordionTrigger>{titel}</AccordionTrigger>
                    <AccordionContent>
                      <p className="whitespace-pre-line leading-relaxed">{text}</p>
                      {code && <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-body-200">{code}</pre>}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {p.fallen && p.fallen.length > 0 && (
                <div className="rounded-lg bg-tone-warning-light p-3 text-body-200"><b>Typische Fallen:</b><ul className="mt-1 list-disc pl-5">{p.fallen.map((f, i) => <li key={i}>{f}</li>)}</ul></div>
              )}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
