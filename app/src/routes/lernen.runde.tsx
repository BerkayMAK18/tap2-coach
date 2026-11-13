/**
 * Lernrunde. Ablauf wie in der Live-App:
 * - Auswahlfrage: erst selbst überlegen, dann Optionen zeigen → wählen → Erklärung. „War geraten“ zählt als unsicher.
 * - Lernkarte: Antwort aufdecken → selbst einschätzen (nicht gewusst / unsicher / gewusst).
 * - Gewertet wird beim „Weiter“, damit „War geraten“ noch berücksichtigt werden kann.
 * Die Runde ist gespeichert (Neuladen setzt an derselben Stelle fort).
 */
import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Star, X } from "lucide-react";
import { Badge, Button, Card, CardEyebrow, Progress } from "@/ui";
import { TP, figFor, getQ } from "@/content/catalog";
import type { Question } from "@/content/schema";
import { st } from "@/lib/srs";
import { cn } from "@/lib/utils";
import { useProgress } from "@/store/progress";

export const Route = createFileRoute("/lernen/runde")({ component: Runde });

const ST_LBL: Record<number, string> = { [-1]: "Neu", 0: "Rot", 1: "Gelb", 2: "Grün" };

function Runde() {
  const { S, sess, setSession, answer, toggleMark } = useProgress();
  const navigate = useNavigate();
  const [step, setStep] = useState<{ shown: boolean; pick: number | null; guess: boolean }>({ shown: false, pick: null, guess: false });

  if (!sess) return <EmptyRound />;
  const done = sess.i >= sess.ids.length;
  if (done) return <Summary />;

  const q = getQ(S, sess.ids[sess.i]);
  const next = (result: "ok" | "unsure" | "wrong") => {
    if (q) answer(q.id, result !== "wrong", result === "unsure");
    setSession({ ...sess, i: sess.i + 1, res: { ...sess.res, [sess.ids[sess.i]]: result } });
    setStep({ shown: false, pick: null, guess: false });
    window.scrollTo({ top: 0 });
  };
  if (!q) { next("unsure"); return null; } // Frage existiert nicht mehr (z. B. eigene Karte gelöscht): überspringen

  const s = st(S, q.id), fig = step.shown || step.pick != null ? figFor(q.id) : undefined;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-body-200 text-slate">{sess.title}</p>
        <span className="text-body-200 tabular-nums">{sess.i + 1} / {sess.ids.length}</span>
        <Button size="sm" variant="ghost" onClick={() => { setSession(null); navigate({ to: "/lernen" }); }}>Beenden</Button>
      </div>
      <Progress value={(sess.i / sess.ids.length) * 100} className="h-1.5" />

      <Card size="lg" className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <CardEyebrow>{TP[q.topic]?.n ?? q.topic}</CardEyebrow>
          <Badge variant="outline">{ST_LBL[s]}</Badge>
          <button onClick={() => toggleMark(q.id)} className="ml-auto rounded-full p-2 hover:bg-muted" aria-pressed={!!S.mark[q.id]} aria-label={S.mark[q.id] ? "Markierung entfernen" : "Frage markieren"}>
            <Star className={cn("h-5 w-5", S.mark[q.id] ? "fill-tone-yellow-main text-tone-yellow-dark" : "text-slate")} />
          </button>
        </div>
        <p className="whitespace-pre-line text-body-400 leading-relaxed">{q.q}</p>

        {q.type === "mc" ? <Mc q={q} step={step} setStep={setStep} /> : <CardAnswer q={q} shown={step.shown} onShow={() => setStep({ ...step, shown: true })} />}

        {fig && (
          <figure className="qfig rounded-lg border p-3">
            {/* Abbildung aus dem eigenen, geprüften Katalog (src/content/generated) – keine Nutzerdaten */}
            <div className="qfig-s" dangerouslySetInnerHTML={{ __html: fig.svg }} />
            {fig.caption && <figcaption className="text-body-200 text-slate">{fig.caption}</figcaption>}
          </figure>
        )}
      </Card>

      {q.type === "mc" && step.pick != null && (
        <div className="flex flex-wrap items-center gap-3">
          {step.pick === q.right && (
            <label className="flex items-center gap-2 text-body-300"><input type="checkbox" checked={step.guess} onChange={(e) => setStep({ ...step, guess: e.target.checked })} /> War geraten</label>
          )}
          <Button className="ml-auto" variant="ink" onClick={() => next(step.pick === q.right ? (step.guess ? "unsure" : "ok") : "wrong")}>Weiter <ArrowRight className="h-4 w-4" /></Button>
        </div>
      )}
      {q.type === "card" && step.shown && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="outline" className="border-tone-error-main" onClick={() => next("wrong")}><X className="h-4 w-4" />Nicht gewusst</Button>
          <Button variant="outline" className="border-tone-yellow-dark" onClick={() => next("unsure")}>Unsicher</Button>
          <Button variant="ink" onClick={() => next("ok")}><Check className="h-4 w-4" />Gewusst</Button>
        </div>
      )}
    </div>
  );
}

type Step = { shown: boolean; pick: number | null; guess: boolean };
function Mc({ q, step, setStep }: { q: Extract<Question, { type: "mc" }>; step: Step; setStep: (s: Step) => void }) {
  if (!step.shown) return <Button variant="outline" className="w-full justify-start py-6" onClick={() => setStep({ ...step, shown: true })}>Antwortmöglichkeiten zeigen <span className="ml-2 text-slate">– überlege zuerst deine eigene Antwort</span></Button>;
  const picked = step.pick != null;
  return (
    <div className="space-y-2">
      {q.opts.map((o, i) => (
        <button key={i} disabled={picked} onClick={() => setStep({ ...step, pick: i })}
          className={cn("w-full rounded-lg border px-4 py-3 text-left transition-colors",
            !picked && "hover:border-ink/40 hover:bg-muted/50",
            picked && i === q.right && "border-tone-success-main bg-tone-success-light",
            picked && i === step.pick && i !== q.right && "border-tone-error-main bg-tone-error-light")}>
          <span className="whitespace-pre-line">{o}</span>
        </button>
      ))}
      {picked && (
        <div className={cn("rounded-lg p-4", step.pick === q.right ? "bg-tone-success-light" : "bg-tone-error-light")}>
          <p className="font-medium">{step.pick === q.right ? "Richtig." : "Leider falsch."}</p>
          <p className="mt-1 whitespace-pre-line leading-relaxed">{q.why}</p>
        </div>
      )}
    </div>
  );
}

function CardAnswer({ q, shown, onShow }: { q: Extract<Question, { type: "card" }>; shown: boolean; onShow: () => void }) {
  if (!shown) return <Button variant="outline" className="w-full py-6" onClick={onShow}>Antwort zeigen</Button>;
  return (
    <div className="space-y-3 border-t pt-4">
      {q.code ? <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-body-200 leading-relaxed">{q.a}</pre> : <p className="whitespace-pre-line leading-relaxed">{q.a}</p>}
      {q.note && <div className="rounded-lg bg-brand/15 p-3 text-body-200"><b>Bewertung:</b><p className="whitespace-pre-line">{q.note}</p></div>}
    </div>
  );
}

function Summary() {
  const { sess, setSession } = useProgress();
  if (!sess) return null;
  const r = Object.values(sess.res), ok = r.filter((x) => x === "ok").length, unsure = r.filter((x) => x === "unsure").length, wrong = r.filter((x) => x === "wrong").length;
  return (
    <Card size="lg" className="mx-auto max-w-xl space-y-4 text-center">
      <h1 className="text-heading-300">Runde geschafft</h1>
      <p className="text-body-300 text-slate">{sess.title}</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-tone-success-light p-3"><p className="font-head text-heading-200">{ok}</p><p className="text-body-200">gewusst</p></div>
        <div className="rounded-lg bg-tone-yellow-light p-3"><p className="font-head text-heading-200">{unsure}</p><p className="text-body-200">unsicher</p></div>
        <div className="rounded-lg bg-tone-error-light p-3"><p className="font-head text-heading-200">{wrong}</p><p className="text-body-200">falsch</p></div>
      </div>
      <p className="text-body-200 text-slate">Falsche Fragen kommen heute noch einmal, unsichere morgen.</p>
      <Button variant="ink" asChild onClick={() => setSession(null)}><Link to="/lernen">Zurück zu den Themen</Link></Button>
    </Card>
  );
}

function EmptyRound() {
  return (
    <Card className="mx-auto max-w-xl space-y-3 text-center">
      <p className="font-head text-heading-100">Keine laufende Runde</p>
      <Button variant="ink" asChild><Link to="/lernen">Thema auswählen</Link></Button>
    </Card>
  );
}
