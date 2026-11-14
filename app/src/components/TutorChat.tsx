/**
 * KI-Tutor-Chat (Premium, nur Admin) über die Supabase Edge Function „tutor“ (Claude API) – füllt in der Tutor-Ansicht
 * die ganze Fläche links; rechts die Leiste mit Lernstand und Aufgabe (routes/tutor.tsx).
 * - System-Teil pro Sitzung eingefroren (Anweisungen + Blockformat + Wissensgraph + Wissen der Schwerpunkt-Themen),
 *   damit Prompt-Caching greift und jede Nachricht günstig bleibt.
 * - Antworten werden als reiner Text angezeigt (SafeMarkdown, kein HTML aus der KI). Aufgaben- und Stand-Blöcke
 *   (lib/tutor-blocks.ts) gehen in die rechte Leiste und werden aus der Blase entfernt.
 * - Enthält eine Antwort den Block „tap2-ergebnis“, kann er mit einem Klick übernommen werden (Graph + Übungsrunde).
 * - Der Chat liegt nur lokal (sessionStorage) – nichts wird gespeichert, was nicht nötig ist.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Ic } from "@/ui-main";
import { TAP2, TP, TOPICS, allQ } from "@/content/catalog";
import { EXAM_DAY } from "@/config";
import type { KnowledgeGraph } from "@/lib/graph";
import { mixIn, openOrder } from "@/lib/srs";
import { supabase } from "@/lib/supabase";
import { INSTRUCTIONS, RESULT_TAG, buildHandoff, buildKnowledgeFor } from "@/lib/tutor-bridge";
import { BLOCK_INSTRUCTIONS, parseStand, parseTask, stripBlocks } from "@/lib/tutor-blocks";
import { useAccount } from "@/store/account";
import { useProgress } from "@/store/progress";
import { useTutor } from "@/store/tutor";
import { applyTutorResult, loadTutorStore } from "./TutorBridge";
import { SafeMarkdown } from "./SafeMarkdown";

type Msg = { role: "user" | "assistant"; content: string };
type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
const KEY = "tap2coach-tutor-chat";
// Preise pro 1 Mio. Tokens (Anfang Nov. 2026) – nur für die Kostenanzeige, abgerechnet wird bei Anthropic
const PRICE = { haiku: { in: 0.1, out: 0.5 }, sonnet: { in: 2, out: 10 } } as const;
const KNOWN = new Set(TOPICS.map((t) => t.id));

export function TutorChat({ g, inputRef }: { g: KnowledgeGraph; inputRef?: React.RefObject<HTMLTextAreaElement | null> }) {
  const user = useAccount((s) => s.user), signIn = useAccount((s) => s.signIn);
  const { S, startSession } = useProgress();
  const { setTask, mergeStand, setTab } = useTutor();
  const navigate = useNavigate();
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; } })();
  const [model, setModel] = useState<"haiku" | "sonnet">(saved?.model ?? "haiku");
  const [system, setSystem] = useState<string>(saved?.system ?? "");
  const [msgs, setMsgs] = useState<Msg[]>(saved?.msgs ?? []);
  const [cost, setCost] = useState<number>(saved?.cost ?? 0);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null), ownRef = useRef<HTMLTextAreaElement>(null), ta = inputRef ?? ownRef;
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify({ model, system, msgs, cost })); } catch { /* privat */ } end.current?.scrollIntoView({ block: "end" }); }, [model, system, msgs, cost]);

  const head = (
    <div className="tutor-head">
      <h3>KI-Tutor</h3><span className="spacer" />
      <span className="tiny muted" title="Schätzung aus dem gemeldeten Verbrauch">≈ {cost.toFixed(3)} $</span>
      <div className="segs" role="group" aria-label="Modell">{(["haiku", "sonnet"] as const).map((m) => <button key={m} type="button" className={`seg ${model === m ? "on" : ""}`} aria-pressed={model === m} onClick={() => setModel(m)}>{m === "haiku" ? "Schnell" : "Gründlich"}</button>)}</div>
    </div>
  );
  if (!supabase) return <div className="tutor-chat">{head}<div className="tutor-empty"><p className="small muted">Der Tutor braucht den Server (Supabase). In dieser Umgebung ist er nicht eingerichtet.</p></div></div>;
  if (!user) return (
    <div className="tutor-chat">{head}
      <div className="tutor-empty"><p className="small muted">Der Tutor läuft über dein Konto. Bitte einmal mit GitHub anmelden.</p>
        <button type="button" className="btn small primary" onClick={() => void signIn()}><Ic name="users" cls="ic xs" /> Mit GitHub anmelden</button></div>
    </div>
  );

  const start = () => {
    const focus = [...g.weaknesses, ...g.gaps].slice(0, 3).map((n) => n.id);
    const sys = `${INSTRUCTIONS}\n${BLOCK_INSTRUCTIONS}\n\n# Wissen (Schwerpunkt-Themen dieser Sitzung)\n${buildKnowledgeFor(TAP2, focus.length ? focus : g.nodes.filter((n) => n.kind === "topic").slice(0, 2).map((n) => n.id))}`;
    setSystem(sys); setMsgs([]); setCost(0); setErr(""); setTask(null);
    void send(buildHandoff(g, EXAM_DAY, loadTutorStore().insights), sys, []);
  };
  async function send(text: string, sys = system, history = msgs) {
    if (!text.trim() || busy) return;
    const next = [...history, { role: "user" as const, content: text.trim().slice(0, 8000) }];
    setMsgs(next); setInput(""); setBusy(true); setErr("");
    try {
      const { data, error } = await supabase!.functions.invoke("tutor", { body: { model, system: sys, messages: next.slice(-40) } });
      if (error) { const ctx = (error as { context?: Response }).context; const j = ctx ? await ctx.json().catch(() => null) : null; throw new Error(j?.error ?? "Der Tutor ist gerade nicht erreichbar."); }
      const u: Usage = data.usage ?? {}, p = PRICE[model], reply = String(data.text ?? "");
      setCost((c) => c + ((u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1) / 1e6 * p.in + (u.output_tokens ?? 0) / 1e6 * p.out);
      setMsgs([...next, { role: "assistant", content: reply }]);
      // Rechte Leiste: neue Aufgabe zeigen (und dorthin wechseln), Einschätzung je Thema übernehmen
      const task = parseTask(reply, KNOWN); if (task) { setTask(task); setTab("aufgabe"); }
      mergeStand(parseStand(reply, KNOWN));
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); setMsgs(history); setInput(text); }
    finally { setBusy(false); }
  }
  const takeResult = (text: string) => {
    try {
      const r = applyTutorResult(text);
      if (r.ueben.length) { const all = allQ(S); startSession("Tutor: " + r.ueben.map((t) => TP[t]?.n ?? t).join(", "), mixIn(S, openOrder(S, all.filter((q) => r.ueben.includes(q.topic))), all, r.ueben).map((q) => q.id)); void navigate({ to: "/lernen/runde" }); }
      else setErr(r.msg);
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  };

  return (
    <div className="tutor-chat">
      {head}
      {!msgs.length ? (
        <div className="tutor-empty">
          <p className="small muted">Der Tutor liest deinen Lernstand, stellt dir Fragen zu deinen schwächsten Themen und erklärt Schritt für Schritt. Aufgaben erscheinen rechts.</p>
          <button type="button" className="btn primary" disabled={busy} onClick={start}><Ic name="play" cls="ic sm" /> Sitzung starten</button>
        </div>
      ) : (
        <div className="tutor-msgs" aria-live="polite">
          {msgs.slice(1).map((m, i) => {
            const body = m.role === "assistant" ? stripBlocks(m.content) : m.content;
            return (
              <div key={i} className={`tut-msg ${m.role === "user" ? "me" : ""}`}>
                {m.role === "assistant" ? <SafeMarkdown text={body} /> : <p className="tut-pre">{body}</p>}
                {m.role === "assistant" && m.content.includes("```" + RESULT_TAG) && <div className="row" style={{ marginTop: 8 }}><button type="button" className="btn small primary" onClick={() => takeResult(m.content)}>Ergebnis übernehmen &amp; üben</button></div>}
              </div>
            );
          })}
          {busy && <p className="small muted">Tutor denkt …</p>}
          <div ref={end} />
        </div>
      )}
      {err && <p className="small warn-text tutor-err">{err}</p>}
      {msgs.length > 0 && (
        <div className="tutor-input">
          <textarea ref={ta} value={input} rows={2} placeholder="Deine Antwort … (Strg/Cmd + Enter senden)" aria-label="Deine Antwort" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send(input); }} />
          <div className="tut-btns">
            <button type="button" className="btn small primary" disabled={busy || !input.trim()} aria-label="Senden" onClick={() => void send(input)}><Ic name="right" cls="ic xs" /> Senden</button>
            <button type="button" className="btn small ghost" disabled={busy} title="Ergebnis-Block anfordern" onClick={() => void send("Ergebnis")}>Ergebnis</button>
            <button type="button" className="btn small ghost" disabled={busy} title="Neue Sitzung" onClick={() => { setMsgs([]); setSystem(""); setCost(0); setTask(null); }}><Ic name="again" cls="ic xs" /> Neu</button>
          </div>
        </div>
      )}
    </div>
  );
}
