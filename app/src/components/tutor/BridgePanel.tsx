/**
 * Vortex (kostenlos) – Brücke zur eigenen KI: Text kopieren → in einer KI deiner Wahl einfügen → am Ende den
 * Ergebnis-Block hier einfügen. Die App sendet dabei nichts; Graph, Lehrplan und XP aktualisieren sich aus dem Block.
 */
import { useState } from "react";
import { bridgePrompt } from "@/lib/vortex-bridge";
import { weakest } from "@/lib/graph";
import { useProgress } from "@/store/progress";
import { useTutor } from "@/store/tutor";
import { Ic } from "@/ui-main";
import { makeHandoff, tn, useGraphs } from "./shared";

export function BridgePanel() {
  const { bridge, closeBridge, applyBridge } = useTutor(), graphs = useGraphs(), S = useProgress((s) => s.S);
  const [copied, setCopied] = useState(false), [paste, setPaste] = useState(""), [res, setRes] = useState<{ ok: boolean; msg: string } | null>(null);
  if (!bridge) return null;
  const text = () => { const g = graphs.get(bridge.thema)!; return bridgePrompt(makeHandoff(bridge.thema, S, useTutor.getState().state, g, bridge.fokus ?? weakest(g, 3).map((c) => c.id))); };
  const copy = async () => {
    const t = text();
    try { await navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 4000); }
    catch { setRes({ ok: false, msg: "Kopieren nicht möglich – dein Browser erlaubt es hier nicht. Versuche es in einem anderen Browser." }); }
  };
  const apply = () => { const r = applyBridge(paste); setRes(r); if (r.ok) setPaste(""); };
  return (
    <div className="tutor-chat vx-bridge">
      <div className="tutor-head">
        <div className="tc-title"><span className="tc-ava" aria-hidden="true"><Ic name="sparkles" cls="ic sm" /></span><div><b>{tn(bridge.thema)}</b><span className="tiny muted">Vortex · mit deiner eigenen KI</span></div></div>
        <span className="spacer" />
        <button type="button" className="btn small ghost" aria-label="Thema schließen" title="Thema schließen (dein Stand bleibt)" onClick={closeBridge}><Ic name="x" cls="ic xs" /></button>
      </div>
      <div className="vx-steps">
        <section className="vx-step">
          <span className="vx-n">1</span>
          <div>
            <b>Text kopieren und in deine KI einfügen</b>
            <p className="small muted">Er enthält die Prüfer-Anweisungen, deinen Stand zu diesem Thema und die Inhalte der Lernpakete. Füge ihn in einen neuen Chat ein – z. B. bei Claude oder ChatGPT, oder in jeder anderen KI.</p>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button type="button" className="btn small primary" onClick={() => void copy()}><Ic name={copied ? "check" : "cards"} cls="ic xs" /> {copied ? "Kopiert" : "Text kopieren"}</button>
              <a className="btn small ghost" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer"><Ic name="globe" cls="ic xs" /> Claude öffnen</a>
              <a className="btn small ghost" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"><Ic name="globe" cls="ic xs" /> ChatGPT öffnen</a>
            </div>
          </div>
        </section>
        <section className="vx-step">
          <span className="vx-n">2</span>
          <div>
            <b>Aufgaben in der KI lösen</b>
            <p className="small muted">Antworte wie in der Prüfung. Optional dazuschreiben: deinen <b>Gedankengang</b> und wie <b>sicher</b> du bist (geraten / unsicher / ziemlich sicher / sicher). Kommst du nicht weiter, schreib „Ich stehe auf dem Schlauch“ – dann bekommst du einen Teilschritt statt der Lösung.</p>
          </div>
        </section>
        <section className="vx-step">
          <span className="vx-n">3</span>
          <div>
            <b>Ergebnis zurückholen</b>
            <p className="small muted">Schreib der KI „Ergebnis“ und füge ihre Antwort (oder nur den Block <code>vortex-ergebnis</code>) hier ein. Jede bewertete Aufgabe zählt wie eine Antwort – mit XP, Combo und Serie – und dein Graph lernt mit.</p>
            <textarea value={paste} rows={4} placeholder="Antwort mit dem Ergebnis-Block einfügen" aria-label="Ergebnis aus der KI" onChange={(e) => setPaste(e.target.value)} />
            <div className="row" style={{ marginTop: 8 }}><button type="button" className="btn small primary" disabled={!paste.trim()} onClick={apply}><Ic name="play" cls="ic xs" /> Ergebnis übernehmen</button></div>
            {res && <p role="status" className={`small tut-pre ${res.ok ? "ok-text" : "warn-text"}`} style={{ marginTop: 8 }}>{res.msg}</p>}
          </div>
        </section>
      </div>
      <p className="tiny muted vx-note"><Ic name="lock" cls="ic xs" /> Die App sendet nichts – du entscheidest, wo du den Text einfügst. Er enthält keine Namen oder Konto-Daten. Für die KI gelten deren Bedingungen.</p>
    </div>
  );
}
