/**
 * KI-Tutor direkt in der App (Premium, nur Admin) über die Supabase Edge Function „tutor“ (Claude API).
 * - System-Teil pro Sitzung eingefroren (Anweisungen + Wissensgraph + Wissen der Schwerpunkt-Themen),
 *   damit Prompt-Caching greift und jede Nachricht günstig bleibt.
 * - Antworten werden als reiner Text angezeigt (kein HTML aus der KI).
 * - Enthält eine Antwort den Block „tap2-ergebnis“, kann er mit einem Klick übernommen werden (Graph + Übungsrunde).
 * - Der Chat liegt nur lokal (sessionStorage) – nichts wird gespeichert, was nicht nötig ist.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Ic } from "@/ui-main";
import { TAP2, TP, allQ } from "@/content/catalog";
import { EXAM_DAY } from "@/config";
import type { KnowledgeGraph } from "@/lib/graph";
import { mixIn, openOrder } from "@/lib/srs";
import { supabase } from "@/lib/supabase";
import { INSTRUCTIONS, RESULT_TAG, buildHandoff, buildKnowledgeFor } from "@/lib/tutor-bridge";
import { useAccount } from "@/store/account";
import { useProgress } from "@/store/progress";
import { applyTutorResult, loadTutorStore } from "./TutorBridge";
import { SafeMarkdown } from "./SafeMarkdown";

type Msg = { role: "user" | "assistant"; content: string };
type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
const KEY = "tap2coach-tutor-chat";
// Preise pro 1 Mio. Tokens (Anfang Nov. 2026) – nur für die Kostenanzeige, abgerechnet wird bei Anthropic
const PRICE = { haiku: { in: 0.1, out: 0.5 }, sonnet: { in: 2, out: 10 } } as const;

export function TutorChat({ g }: { g: KnowledgeGraph }) {
  const user = useAccount((s) => s.user), signIn = useAccount((s) => s.signIn);
  const { S, startSession } = useProgress();
  const navigate = useNavigate();
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; } })();
  const [model, setModel] = useState<"haiku" | "sonnet">(saved?.model ?? "haiku");
  const [system, setSystem] = useState<string>(saved?.system ?? "");
  const [msgs, setMsgs] = useState<Msg[]>(saved?.msgs ?? []);
  const [cost, setCost] = useState<number>(saved?.cost ?? 0);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify({ model, system, msgs, cost })); } catch { /* privat */ } end.current?.scrollIntoView({ block: "end" }); }, [model, system, msgs, cost]);

  if (!supabase) return null;
  if (!user) return (
    <section className="card"><h3>KI-Tutor</h3>
      <p className="small muted" style={{ marginTop: 4 }}>Der Tutor läuft über dein Konto. Bitte einmal mit GitHub anmelden.</p>
      <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn small primary" onClick={() => void signIn()}><Ic name="users" cls="ic xs" /> Mit GitHub anmelden</button></div>
    </section>
  );

  const start = () => {
    const focus = [...g.weaknesses, ...g.gaps].slice(0, 3).map((n) => n.id);
    const sys = `${INSTRUCTIONS}\n\n# Wissen (Schwerpunkt-Themen dieser Sitzung)\n${buildKnowledgeFor(TAP2, focus.length ? focus : g.nodes.filter((n) => n.kind === "topic").slice(0, 2).map((n) => n.id))}`;
    setSystem(sys); setMsgs([]); setCost(0); setErr("");
    void send(buildHandoff(g, EXAM_DAY, loadTutorStore().insights), sys, []);
  };
  async function send(text: string, sys = system, history = msgs) {
    if (!text.trim() || busy) return;
    const next = [...history, { role: "user" as const, content: text.trim().slice(0, 8000) }];
    setMsgs(next); setInput(""); setBusy(true); setErr("");
    try {
      const { data, error } = await supabase!.functions.invoke("tutor", { body: { model, system: sys, messages: next.slice(-40) } });
      if (error) { const ctx = (error as { context?: Response }).context; const j = ctx ? await ctx.json().catch(() => null) : null; throw new Error(j?.error ?? "Der Tutor ist gerade nicht erreichbar."); }
      const u: Usage = data.usage ?? {}, p = PRICE[model];
      setCost((c) => c + ((u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1) / 1e6 * p.in + (u.output_tokens ?? 0) / 1e6 * p.out);
      setMsgs([...next, { role: "assistant", content: String(data.text ?? "") }]);
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); setMsgs(history); setInput(text); }
    finally { setBusy(false); }
  }
  const takeResult = (text: string) => {
    try {
      const r = applyTutorResult(text);
      if (r.ueben.length) { const all = allQ(S); startSession("Tutor: " + r.ueben.map((t) => TP[t]?.n ?? t).join(", "), mixIn(S, openOrder(S, all.filter((q) => r.ueben.includes(q.topic))), all, r.ueben).map((q) => q.id)); navigate({ to: "/lernen/runde" }); }
      else setErr(r.msg);
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  };

  return (
    <section className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>KI-Tutor</h3>
        <div className="segs" role="group" aria-label="Modell">{(["haiku", "sonnet"] as const).map((m) => <button key={m} type="button" className={`seg ${model === m ? "on" : ""}`} aria-pressed={model === m} onClick={() => setModel(m)}>{m === "haiku" ? "Schnell (Haiku)" : "Gründlich (Sonnet)"}</button>)}</div>
      </div>
      <p className="tiny muted" title="Schätzung aus dem gemeldeten Verbrauch">≈ {cost.toFixed(3)} $ diese Sitzung</p>
      {!msgs.length ? (
        <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn primary" disabled={busy} onClick={start}><Ic name="play" cls="ic sm" /> Sitzung starten (Diagnose zu deinen Schwächen)</button></div>
      ) : (
        <>
          <div className="tut-chat">
            {msgs.slice(1).map((m, i) => (
              <div key={i} className={`tut-msg ${m.role === "user" ? "me" : ""}`}>
                {m.role === "assistant" ? <SafeMarkdown text={m.content} /> : <p className="tut-pre">{m.content}</p>}
                {m.role === "assistant" && m.content.includes("```" + RESULT_TAG) && <div className="row" style={{ marginTop: 8 }}><button type="button" className="btn small primary" onClick={() => takeResult(m.content)}>Ergebnis übernehmen &amp; üben</button></div>}
              </div>
            ))}
            {busy && <p className="small muted">Tutor denkt …</p>}
            <div ref={end} />
          </div>
          <div className="tut-input">
            <textarea value={input} rows={2} placeholder="Deine Antwort …" aria-label="Deine Antwort" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send(input); }} />
            <div className="tut-btns">
              <button type="button" className="btn small primary" disabled={busy || !input.trim()} aria-label="Senden" onClick={() => void send(input)}><Ic name="right" cls="ic xs" /> Senden</button>
              <button type="button" className="btn small ghost" disabled={busy} title="Ergebnis-Block anfordern" onClick={() => void send("Ergebnis")}>Ergebnis</button>
            </div>
          </div>
          <div className="row" style={{ marginTop: 8 }}><button type="button" className="btn small ghost" onClick={() => { setMsgs([]); setSystem(""); setCost(0); }}><Ic name="again" cls="ic xs" /> Neue Sitzung</button></div>
        </>
      )}
      {err && <p className="small warn-text" style={{ marginTop: 8 }}>{err}</p>}
    </section>
  );
}
