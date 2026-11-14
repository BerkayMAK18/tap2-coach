/**
 * Tutor-Seite → Brücke zu Claude (Claude Pro, keine API-Kosten). Siehe lib/tutor-bridge.ts.
 * Ergebnisse (belegte Erkenntnisse, Fehlvorstellungen) liegen nur lokal unter „tap2coach-tutor“.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Ic } from "@/ui-main";
import { TAP2, TOPICS, TP, allQ } from "@/content/catalog";
import { EXAM_DAY } from "@/config";
import type { KnowledgeGraph } from "@/lib/graph";
import { mixIn, openOrder } from "@/lib/srs";
import { INSTRUCTIONS, buildHandoff, buildKnowledgeMd, parseResult, type Insight, type Misconception } from "@/lib/tutor-bridge";
import { useProgress } from "@/store/progress";

const KEY = "tap2coach-tutor";
type Store = { insights: Insight[]; miscon: Misconception[] };
export const loadTutorStore = (): Store => load();
/** Ergebnis-Block übernehmen: Erkenntnisse speichern, Übungsrunde zu den Themen vorbereiten. Gibt Themen + Meldung zurück. */
export function applyTutorResult(text: string): { ueben: string[]; msg: string } {
  const r = parseResult(text, new Set(TOPICS.map((t) => t.id)));
  const cur = load(), next = { insights: [...cur.insights, ...r.verstanden].slice(-100), miscon: [...cur.miscon, ...r.fehlvorstellungen].slice(-50) };
  saveStore(next);
  return { ueben: r.ueben, msg: `Übernommen: ${r.verstanden.length} Erkenntnisse, ${r.fehlvorstellungen.length} Fehlvorstellungen.` };
}
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
    <div className="tut-bridge">
      <details className="tx-paste">
        <summary className="small">Einmalig einrichten</summary>
        <ol className="small">
          <li>Auf claude.ai (oder in der Claude-App) ein neues <b>Projekt</b> „TAP2 Tutor“ anlegen.</li>
          <li>Wissensdatei herunterladen und im Projekt unter „Projektwissen“ hochladen: <button type="button" className="btn small" onClick={download}><Ic name="down" cls="ic xs" /> TAP2-Wissen.md</button></li>
          <li>Projekt-Anweisungen kopieren und im Projekt unter „Anweisungen“ einfügen: <button type="button" className="btn small" onClick={() => void copy(INSTRUCTIONS, "Anweisungen")}><Ic name="cards" cls="ic xs" /> Anweisungen kopieren</button></li>
        </ol>
        <p className="tiny muted">Nur dein privates Konto verwenden. Die Wissensdatei bei größeren Inhaltsänderungen neu hochladen.</p>
      </details>

      <p className="small" style={{ marginTop: 12 }}><b>1.</b> Übergabe kopieren und im Projekt einen neuen Chat damit beginnen.</p>
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn small primary" onClick={() => void copy(buildHandoff(g, EXAM_DAY, data.insights), "Übergabe")}><Ic name="cards" cls="ic xs" /> An Claude übergeben</button>
        <a className="btn small ghost" href="https://claude.ai/projects" target="_blank" rel="noopener noreferrer"><Ic name="globe" cls="ic xs" /> Claude öffnen</a>
      </div>

      <p className="small" style={{ marginTop: 14 }}><b>2.</b> Am Ende schreibt Claude einen Block <code>tap2-ergebnis</code>. Hier einfügen – der Graph merkt sich, was du belegt kannst, und die vorgeschlagenen Themen starten als Übungsrunde (mit XP).</p>
      <textarea value={paste} rows={5} placeholder="Antwort oder Ergebnis-Block von Claude einfügen" aria-label="Ergebnis von Claude" onChange={(e) => setPaste(e.target.value)} style={{ marginTop: 8 }} />
      <div className="row" style={{ marginTop: 8 }}><button type="button" className="btn small primary" disabled={!paste.trim()} onClick={apply}><Ic name="play" cls="ic xs" /> Ergebnis übernehmen</button></div>

      {msg && <p role="status" className="small" style={{ marginTop: 8 }}>{msg}</p>}
      {err && <p className="small warn-text" style={{ marginTop: 8 }}>{err}</p>}

      {(data.insights.length > 0 || data.miscon.length > 0) && (
        <div className="tut-cols" style={{ marginTop: 12 }}>
          <div><b className="small">Belegt verstanden</b><ul className="small">{data.insights.slice(-8).reverse().map((i, k) => <li key={k}><b>{TP[i.thema]?.n ?? i.thema}:</b> {i.aussage}</li>)}</ul></div>
          <div><b className="small">Fehlvorstellungen</b><ul className="small">{data.miscon.slice(-8).reverse().map((i, k) => <li key={k}><b>{TP[i.thema]?.n ?? i.thema}:</b> {i.aussage}</li>)}</ul></div>
        </div>
      )}
    </div>
  );
}
