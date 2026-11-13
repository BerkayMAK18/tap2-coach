/**
 * Tutor-Seite → Brücke zu Claude (Claude Pro, keine API-Kosten). Siehe lib/tutor-bridge.ts.
 * Ergebnisse (belegte Erkenntnisse, Fehlvorstellungen) liegen nur lokal unter „tap2coach-tutor“.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ClipboardCopy, Download, ExternalLink, Play } from "lucide-react";
import { Button, Card, CardEyebrow, InlineError, Textarea } from "@/ui";
import { TAP2, TOPICS, TP, allQ } from "@/content/catalog";
import { EXAM_DAY } from "@/config";
import type { KnowledgeGraph } from "@/lib/graph";
import { mixIn, openOrder } from "@/lib/srs";
import { INSTRUCTIONS, buildHandoff, buildKnowledgeMd, parseResult, type Insight, type Misconception } from "@/lib/tutor-bridge";
import { useProgress } from "@/store/progress";

const KEY = "tap2coach-tutor";
type Store = { insights: Insight[]; miscon: Misconception[] };
const load = (): Store => { try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); return { insights: Array.isArray(o?.insights) ? o.insights : [], miscon: Array.isArray(o?.miscon) ? o.miscon : [] }; } catch { return { insights: [], miscon: [] }; } };
const saveStore = (s: Store) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* privat */ } };

export function TutorBridge({ g }: { g: KnowledgeGraph }) {
  const [data, setData] = useState<Store>(load);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const { S, startSession } = useProgress();
  const navigate = useNavigate();
  const known = new Set(TOPICS.map((t) => t.id));

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setMsg(`${what} kopiert.`); } catch { setErr("Kopieren nicht möglich – bitte manuell markieren."); }
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buildKnowledgeMd(TAP2)], { type: "text/markdown" }));
    a.download = "TAP2-Wissen.md"; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  const apply = () => {
    setErr(""); setMsg("");
    try {
      const r = parseResult(paste, known);
      const next = { insights: [...data.insights, ...r.verstanden].slice(-100), miscon: [...data.miscon, ...r.fehlvorstellungen].slice(-50) };
      saveStore(next); setData(next); setPaste("");
      setMsg(`Übernommen: ${r.verstanden.length} Erkenntnisse, ${r.fehlvorstellungen.length} Fehlvorstellungen.`);
      if (r.ueben.length) {
        const all = allQ(S), qs = mixIn(S, openOrder(S, all.filter((q) => r.ueben.includes(q.topic))), all, r.ueben);
        startSession("Tutor: " + r.ueben.map((t) => TP[t]?.n ?? t).join(", "), qs.map((q) => q.id));
        navigate({ to: "/lernen/runde" });
      }
    } catch (e) { setErr(e instanceof Error ? e.message : "Unbekannter Fehler."); }
  };

  return (
    <Card className="space-y-5">
      <CardEyebrow>KI-Tutor über dein Claude-Projekt</CardEyebrow>
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer font-medium">Einmalig einrichten</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-body-300">
          <li>Auf claude.ai (oder in der Claude-App) ein neues <b>Projekt</b> „TAP2 Tutor“ anlegen.</li>
          <li>Wissensdatei herunterladen und im Projekt unter „Projektwissen“ hochladen: <Button size="sm" variant="outline" onClick={download}><Download className="h-4 w-4" />TAP2-Wissen.md</Button></li>
          <li>Projekt-Anweisungen kopieren und im Projekt unter „Anweisungen“ einfügen: <Button size="sm" variant="outline" onClick={() => void copy(INSTRUCTIONS, "Anweisungen")}><ClipboardCopy className="h-4 w-4" />Anweisungen kopieren</Button></li>
        </ol>
        <p className="mt-2 text-body-200 text-slate">Nur dein privates Konto verwenden. Die Wissensdatei bei größeren Inhaltsänderungen neu hochladen.</p>
      </details>

      <div className="space-y-2">
        <p className="text-body-300"><b>1.</b> Übergabe kopieren und im Projekt einen neuen Chat damit beginnen.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ink" onClick={() => void copy(buildHandoff(g, EXAM_DAY, data.insights), "Übergabe")}><ClipboardCopy className="h-4 w-4" />An Claude übergeben</Button>
          <Button variant="ghost" asChild><a href="https://claude.ai/projects" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Claude öffnen</a></Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-body-300"><b>2.</b> Am Ende schreibt Claude einen Block <code>tap2-ergebnis</code>. Hier einfügen – der Graph merkt sich, was du belegt kannst, und die vorgeschlagenen Themen starten als Übungsrunde (mit XP).</p>
        <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} placeholder="Antwort oder Ergebnis-Block von Claude einfügen" className="font-mono text-body-200" />
        <Button variant="ink" onClick={apply} disabled={!paste.trim()}><Play className="h-4 w-4" />Ergebnis übernehmen</Button>
      </div>

      {msg && <p role="status" className="text-body-200">{msg}</p>}
      {err && <InlineError>{err}</InlineError>}

      {(data.insights.length > 0 || data.miscon.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <div><p className="font-medium">Belegt verstanden</p><ul className="mt-1 space-y-1 text-body-200">{data.insights.slice(-8).reverse().map((i, k) => <li key={k}><b>{TP[i.thema]?.n ?? i.thema}:</b> {i.aussage}</li>)}</ul></div>
          <div><p className="font-medium">Fehlvorstellungen</p><ul className="mt-1 space-y-1 text-body-200">{data.miscon.slice(-8).reverse().map((i, k) => <li key={k}><b>{TP[i.thema]?.n ?? i.thema}:</b> {i.aussage}</li>)}</ul></div>
        </div>
      )}
    </Card>
  );
}
