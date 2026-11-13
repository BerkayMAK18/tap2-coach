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
import { Github, Play, RotateCcw, Send } from "lucide-react";
import { Button, Card, CardEyebrow, InlineError, Textarea } from "@/ui";
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
    <Card className="space-y-3"><CardEyebrow>KI-Tutor</CardEyebrow>
      <p className="text-body-300">Der Tutor läuft über dein Konto. Bitte einmal mit GitHub anmelden.</p>
      <Button variant="ink" onClick={() => void signIn()}><Github className="h-4 w-4" />Mit GitHub anmelden</Button>
    </Card>
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
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <CardEyebrow>KI-Tutor</CardEyebrow>
        <div className="ml-auto flex rounded-full border p-1 text-body-200" role="tablist" aria-label="Modell">
          {(["haiku", "sonnet"] as const).map((m) => <button key={m} role="tab" aria-selected={model === m} onClick={() => setModel(m)} className={model === m ? "rounded-full bg-ink px-3 py-0.5 text-canvas" : "px-3 py-0.5 text-slate"}>{m === "haiku" ? "Schnell (Haiku)" : "Gründlich (Sonnet)"}</button>)}
        </div>
        <span className="text-body-100 text-slate" title="Schätzung aus dem gemeldeten Verbrauch">≈ {cost.toFixed(3)} $ diese Sitzung</span>
      </div>
      {!msgs.length ? (
        <Button variant="ink" onClick={start} loading={busy}><Play className="h-4 w-4" />Sitzung starten (Diagnose zu deinen Schwächen)</Button>
      ) : (
        <>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto rounded-lg bg-muted/40 p-3">
            {msgs.slice(1).map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-ink p-3 text-canvas" : "max-w-[95%] rounded-lg bg-card p-3"}>
                {m.role === "assistant" ? <SafeMarkdown text={m.content} /> : <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>}
                {m.role === "assistant" && m.content.includes("```" + RESULT_TAG) && <Button size="sm" variant="ink" className="mt-2" onClick={() => takeResult(m.content)}>Ergebnis übernehmen & üben</Button>}
              </div>
            ))}
            {busy && <p className="text-body-200 text-slate">Tutor denkt …</p>}
            <div ref={end} />
          </div>
          <div className="flex gap-2">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} placeholder="Deine Antwort …" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send(input); }} />
            <div className="flex flex-col gap-2">
              <Button variant="ink" onClick={() => void send(input)} disabled={busy || !input.trim()} aria-label="Senden"><Send className="h-4 w-4" /></Button>
              <Button variant="ghost" onClick={() => void send("Ergebnis")} disabled={busy} title="Ergebnis-Block anfordern">Ergebnis</Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setMsgs([]); setSystem(""); setCost(0); }}><RotateCcw className="h-4 w-4" />Neue Sitzung</Button>
        </>
      )}
      {err && <InlineError>{err}</InlineError>}
    </Card>
  );
}
