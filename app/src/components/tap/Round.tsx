import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, Button, Card, Label, Progress, Textarea, useToast } from "@/ui";
import { saveRating, type Item, type ProgressRow, type Rating } from "@/lib/tap2";
import { AiGrade } from "./AiGrade";
import { useTutor } from "./useTutor";
import { CodeEditor } from './CodeEditor';
import { codeLanguage } from '@/lib/curriculum';

const TYPE: Record<Item["type"], string> = { card: "Karteikarte", mc: "Auswahlfrage", open: "Offene Frage" };
const pre = "whitespace-pre-wrap font-text text-body-300";

export function Round({ items, progress, onDone }: { items: Item[]; progress: ProgressRow[]; onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState({ sure: 0, unsure: 0, wrong: 0 });
  const qc = useQueryClient();
  const { toast } = useToast();
  const item = items[idx];

  async function rate(r: Rating) {
    try {
      await saveRating(item, progress.find((p) => p.item_id === item.id), r);
    } catch (e) {
      toast({ title: "Nicht gespeichert", description: e instanceof Error ? e.message : "", variant: "error" });
    }
    setScore((s) => ({ ...s, [r]: s[r] + 1 }));
    setIdx((i) => i + 1);
    if (idx + 1 >= items.length) qc.invalidateQueries({ queryKey: ["progress"] });
  }

  if (!item) {
    return (
      <Card surface="brand" size="md" className="space-y-4">
        <h2 className="font-head text-heading-100">Runde fertig</h2>
        <p className="font-text text-body-300">Sicher: {score.sure} · Unsicher: {score.unsure} · Falsch: {score.wrong}. Unsicheres und Falsches kommt morgen wieder.</p>
        <Button variant="ink" onClick={onDone}>Zurück zur Übersicht</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Progress value={(idx / items.length) * 100} aria-label="Fortschritt der Runde" className="flex-1" />
        <span className="font-text text-body-200">{idx + 1} / {items.length}</span>
      </div>
      <ItemView key={item.id} item={item} onRate={rate} />
    </div>
  );
}

function ItemView({ item, onRate }: { item: Item; onRate: (r: Rating) => void }) {
  const [shown, setShown] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const tutor = useTutor();
  const solution = item.type === "mc" ? item.options[item.correct] : item.a;
  const language = item.type !== 'mc' ? codeLanguage(item.topic, item.q) : null;

  const explain = (
    <Button variant="ghost" size="sm" loading={tutor.busy} onClick={() => tutor.start(`FIAE ${item.topic}: Prüfe zuerst meinen Stand und plane den Lernweg.\nAufgabe: ${item.q}\nMeine Antwort: ${item.type === 'mc' ? pick === null ? 'Noch nicht beantwortet' : item.options[pick] : answer || 'Noch nicht beantwortet'}\nMusterlösung zum fachlichen Abgleich, nicht als Beleg für mein Wissen: ${solution}`)}>
      Mit KI-Tutor klären
    </Button>
  );

  return (
    <Card surface="white" size="md" className="space-y-5">
      <Badge variant="white">{TYPE[item.type]}{item.type === "open" ? ` · ${item.points} P` : ""}</Badge>
      <p className={pre}>{item.q}</p>
      {language && <CodeEditor language={language} initialCode={language === 'python' ? '# Schreibe deine Lösung in Python\n' : '-- Schreibe deine SQL-Abfrage\n'} onChange={setAnswer} />}

      {item.type === "mc" && (
        <div className="space-y-2">
          {item.options.map((o, i) => {
            const state = pick === null ? "" : i === item.correct ? "border-highlight bg-tone-success-light" : i === pick ? "border-tone-error-main bg-tone-red-light" : "opacity-60";
            return (
              <button
                key={i}
                type="button"
                disabled={pick !== null}
                onClick={() => setPick(i)}
                className={`block w-full rounded-sm border-2 border-ink p-3 text-left font-text text-body-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${state}`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}

      {item.type === "open" && !language && (
        <div className="space-y-2">
          <Label htmlFor="ans">Deine Antwort</Label>
          <Textarea id="ans" rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </div>
      )}

      {(item.type === 'open' || (language && item.type === 'card')) && <AiGrade itemId={item.id} question={item.q} solution={solution} answer={answer} points={item.type === 'open' ? item.points : 5} />}

      {item.type !== "mc" && !shown && <Button variant="solid" onClick={() => setShown(true)}>Lösung zeigen</Button>}

      {(shown || pick !== null) && (
        <div className="space-y-4 border-t-2 border-ink pt-4">
          {item.type !== "mc" && <p className={pre}><strong>Musterlösung:</strong>{"\n"}{item.a}</p>}
          {item.type !== "open" && item.note && <p className={`${pre} text-slate`}>{item.note}</p>}
          <div className="flex flex-wrap gap-3">
            {item.type === "mc" ? (
              pick === item.correct ? (
                <>
                  <Button variant="solid" onClick={() => onRate("sure")}>Sicher gewusst</Button>
                  <Button variant="ink" onClick={() => onRate("unsure")}>War geraten</Button>
                </>
              ) : (
                <Button variant="solid" onClick={() => onRate("wrong")}>Weiter</Button>
              )
            ) : (
              <>
                <Button variant="solid" onClick={() => onRate("sure")}>Gewusst</Button>
                <Button variant="ink" onClick={() => onRate("unsure")}>Unsicher</Button>
                <Button variant="ink" onClick={() => onRate("wrong")}>Nicht gewusst</Button>
              </>
            )}
            {explain}
          </div>
        </div>
      )}
    </Card>
  );
}
