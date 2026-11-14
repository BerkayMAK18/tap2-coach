/**
 * KI-Tutor-Chat (Premium, nur Admin): Lernpfad im Gespräch – Stand finden → Lehrplan → Lernen.
 * Der Tutor arbeitet mit Werkzeugen (lib/tutor-protocol.ts): Fragen erscheinen als Karten mit Antwortfeldern
 * (Auswahl A–D oder freie Antwort, „laut denken“, Sicherheit, „Ich weiß es nicht“), Bewertungen, Lehrplan und
 * abgeschlossene Schritte als eigene Karten. KI-Text nur über SafeMarkdown, nie als HTML.
 */
import { useEffect, useRef, useState } from "react";
import { TP } from "@/content/catalog";
import { SICHER_LBL, feedOf, phaseOf, type Answer, type Feed, type Phase, type Question } from "@/lib/tutor-protocol";
import { supabase } from "@/lib/supabase";
import { useAccount } from "@/store/account";
import { IDS, useTutor, type Model } from "@/store/tutor";
import { Ic } from "@/ui-main";
import { SafeMarkdown } from "./SafeMarkdown";

const L = "ABCD";
const PHASES: [Phase, string][] = [["stand", "Stand finden"], ["plan", "Lehrplan"], ["lernen", "Lernen"]];
const tn = (id: string) => TP[id]?.n ?? id;

export function TutorChat({ handoff, onPlan }: { handoff: () => string; onPlan: () => void }) {
  const user = useAccount((s) => s.user), signIn = useAccount((s) => s.signIn);
  const { pfad, convo, busy, err, start, send, setModel, reset } = useTutor();
  const end = useRef<HTMLDivElement>(null);
  const feed = feedOf(convo.msgs, IDS, convo.queued), phase = phaseOf(pfad);
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [convo.msgs.length, busy]);

  const head = (
    <div className="tutor-head">
      <div className="tc-title"><span className="tc-ava" aria-hidden="true"><Ic name="sparkles" cls="ic sm" /></span><div><b>KI-Tutor</b><span className="tiny muted">auf Basis der TAP2-Wissensbasis</span></div></div>
      <span className="spacer" />
      <span className="tiny muted" title="Schätzung aus dem gemeldeten Verbrauch">≈ {convo.cost.toFixed(3)} $</span>
      <div className="segs" role="group" aria-label="Modell">{(["haiku", "sonnet"] as Model[]).map((m) => <button key={m} type="button" className={`seg ${convo.model === m ? "on" : ""}`} aria-pressed={convo.model === m} onClick={() => setModel(m)}>{m === "haiku" ? "Schnell" : "Gründlich"}</button>)}</div>
      {convo.msgs.length > 0 && <button type="button" className="btn small ghost" disabled={busy} title="Neues Gespräch (Lehrplan und Lernstand bleiben)" onClick={() => reset()}><Ic name="again" cls="ic xs" /> Neu</button>}
      <Stepper phase={phase} />
    </div>
  );
  // Ohne Server oder Anmeldung: Verlauf bleibt lesbar, nur Senden geht nicht
  const blocked = !supabase ? <p className="small muted">Der Tutor braucht den Server (Supabase). In dieser Umgebung ist er nicht eingerichtet.</p>
    : !user ? <div className="row"><p className="small muted" style={{ margin: 0 }}>Der Tutor läuft über dein Konto. Bitte einmal mit GitHub anmelden.</p><button type="button" className="btn small primary" onClick={() => void signIn()}><Ic name="users" cls="ic xs" /> Mit GitHub anmelden</button></div>
    : null;
  if (!convo.msgs.length) {
    const resume = pfad.plan.length > 0 || pfad.standFertig;
    return (
      <div className="tutor-chat">{head}
        <div className="tutor-empty tc-hero">
          <h2>{resume ? "Weiter auf deinem Lernpfad" : "Dein persönlicher Weg zur TAP2"}</h2>
          <p className="muted">Der Tutor liest deinen Lernstand aus der App, findet mit ein paar Fragen heraus, wo du stehst, und baut daraus einen Lehrplan. Dann gehst du ihn Schritt für Schritt mit Fragen zu deinen Lücken durch – jede Antwort bringt XP und zählt in deinen Lernstand.</p>
          <ol className="tc-steps">
            {PHASES.map(([k, l], i) => <li key={k} className={phase === k ? "on" : PHASES.findIndex(([x]) => x === phase) > i || phase === "fertig" ? "done" : ""}><span>{i + 1}</span><div><b>{l}</b><small className="muted">{k === "stand" ? "3–6 kurze Diagnosefragen" : k === "plan" ? "kleinster Weg zur Prüfungsreife" : "erklären, prüfen, Lücken schließen"}</small></div></li>)}
          </ol>
          {blocked ?? <button type="button" className="btn primary big" disabled={busy} onClick={() => void start(handoff())}><Ic name="play" cls="ic sm" /> {resume ? "Weitermachen" : "Los geht's"}</button>}
          {err && <p className="small warn-text">{err}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="tutor-chat">
      {head}
      <div className="tutor-msgs" aria-live="polite">
        {feed.map((f, n) => <FeedItem key={n} f={f} onPlan={onPlan} handoff={handoff} />)}
        {busy && <div className="tc-row"><span className="tc-ava sm" aria-hidden="true"><Ic name="sparkles" cls="ic xs" /></span><div className="tc-bubble tc-typing" aria-label="Tutor schreibt"><i /><i /><i /></div></div>}
        {!busy && !convo.pending && phase === "fertig" && <div className="tc-note ok"><Ic name="trophy" cls="ic xs" /> Lehrplan geschafft. Frag nach einer Wiederholung oder starte ein neues Gespräch.</div>}
        <div ref={end} />
      </div>
      {err && <p className="small warn-text tutor-err" role="alert">{err}</p>}
      {blocked ? <div className="tutor-input">{blocked}</div> : <Composer pending={!!convo.pending} busy={busy} onSend={(t) => send(t, handoff)} />}
    </div>
  );
}

function Stepper({ phase }: { phase: Phase }) {
  const idx = phase === "fertig" ? 3 : PHASES.findIndex(([k]) => k === phase);
  return (
    <ol className="tc-stepper" aria-label="Ablauf">
      {PHASES.map(([k, l], i) => <li key={k} className={i < idx ? "done" : i === idx ? "on" : ""} aria-current={i === idx ? "step" : undefined}><span>{i < idx ? "✓" : i + 1}</span>{l}</li>)}
    </ol>
  );
}

function FeedItem({ f, onPlan, handoff }: { f: Feed; onPlan: () => void; handoff: () => string }) {
  const pfad = useTutor((s) => s.pfad);
  switch (f.k) {
    case "start": return <div className="tc-note"><Ic name="layers" cls="ic xs" /> Lernstand aus der App übergeben</div>;
    case "me": return <div className="tc-row me"><div className="tc-bubble me"><p className="tut-pre">{f.text}</p></div></div>;
    case "tutor": return <div className="tc-row"><span className="tc-ava sm" aria-hidden="true"><Ic name="sparkles" cls="ic xs" /></span><div className="tc-bubble"><SafeMarkdown text={f.text} /></div></div>;
    case "frage": return <QuestionCard q={f.q} antwort={f.antwort} handoff={handoff} />;
    case "stand": return <div className="tc-note"><Ic name="target" cls="ic xs" /> {f.fertig ? "Diagnose abgeschlossen – Lehrplan folgt" : `Lernstand eingeschätzt (${f.n} ${f.n === 1 ? "Thema" : "Themen"})`}</div>;
    case "plan": return (
      <div className="tc-card tc-plan">
        <div className="row"><Ic name="map" cls="ic sm" /><b>Lehrplan erstellt · {f.n} Schritte</b><span className="spacer" /><button type="button" className="btn small" onClick={onPlan}>Ansehen</button></div>
        {f.ziel && <p className="small muted" style={{ margin: "6px 0 0" }}>{f.ziel}</p>}
      </div>
    );
    case "bewertung": {
      const r = f.punkte / f.max, cls = r >= 0.75 ? "ok" : r >= 0.5 ? "yellow" : "bad";
      return (
        <div className={`tc-card tc-score ${cls}`}>
          <div className="row"><b>{fmt(f.punkte)} / {fmt(f.max)} Punkte</b><span className="chip">{tn(f.thema)}</span><span className="spacer" /><span className="tiny muted">{r >= 0.5 ? "zählt als richtig" : "noch nicht"}</span></div>
          <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${Math.round(r * 100)}%`, background: `var(--${cls})` }} /></div>
          {f.fehl && <p className="small" style={{ margin: "8px 0 0" }}><b>Fehlvorstellung:</b> {f.fehl}</p>}
        </div>
      );
    }
    case "schritt": {
      const s = pfad.plan.find((x) => x.id === f.id);
      return <div className="tc-card tc-done"><div className="row"><Ic name="check" cls="ic sm" /><b>Schritt geschafft{s ? `: ${s.titel}` : ""}</b></div>{f.beleg && <p className="small muted" style={{ margin: "6px 0 0" }}>{f.beleg}</p>}</div>;
    }
  }
}
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

/** Frage des Tutors: offen → Antwortfelder; beantwortet → Antwort und (bei Auswahl) Auflösung */
function QuestionCard({ q, antwort, handoff }: { q: Question; antwort?: string; handoff: () => string }) {
  const { convo, pfad, busy, answer } = useTutor();
  const open = convo.pending?.toolId === q.toolId && !antwort, meta = convo.meta[q.toolId];
  const step = q.schritt ? pfad.plan.find((s) => s.id === q.schritt) : undefined;
  const [wahl, setWahl] = useState<number | null>(null), [text, setText] = useState(""), [denken, setDenken] = useState("");
  const [think, setThink] = useState(false), [sicher, setSicher] = useState<Answer["sicher"] | null>(null);
  const ready = sicher && (q.art === "auswahl" ? wahl != null : text.trim().length > 0);
  const submit = (a: Partial<Answer>) => void answer({ sicher: sicher ?? "unsicher", ...(denken.trim() ? { denken } : {}), ...a } as Answer, handoff);
  const skipped = antwort?.startsWith("Noch keine Antwort");

  return (
    <div className={`tc-card tc-q ${open ? "open" : ""}`}>
      <div className="row tc-q-h">
        <span className="chip blue">{q.art === "auswahl" ? "Auswahl" : "Freie Antwort"}</span>
        <span className="chip">{tn(q.thema)}</span>
        {q.operator && <span className="chip violet">{q.operator}</span>}
        {q.punkte != null && <span className="chip">{q.punkte} P</span>}
        <span className="spacer" />
        <span className="tiny muted">{step ? `Schritt: ${step.titel}` : q.schritt ? "Prüffrage" : "Diagnose"}</span>
      </div>
      {q.kontext && <div className="tc-ctx small"><SafeMarkdown text={q.kontext} /></div>}
      <div className="qtext tc-qtext"><SafeMarkdown text={q.frage} /></div>

      {q.art === "auswahl" && q.optionen && (
        <div className="optlist tc-opts">
          {q.optionen.map((o, i) => {
            const done = !open && meta?.wahl !== undefined;
            const cls = done ? (i === q.richtig ? "right" : i === meta.wahl ? "wrong" : "") : open && wahl === i ? "picked" : "";
            return <button key={i} type="button" className={`opt ${cls}`} disabled={!open || busy} aria-pressed={open ? wahl === i : undefined} onClick={() => setWahl(i)}><span className="k">{L[i]}</span><span>{o}</span></button>;
          })}
        </div>
      )}

      {open ? (
        <div className="tc-answer">
          {q.art === "frei" && <textarea value={text} rows={4} placeholder="Deine Antwort – wie in der Prüfung …" aria-label="Deine Antwort" onChange={(e) => setText(e.target.value)} />}
          {think ? <textarea value={denken} rows={2} placeholder="Laut denken: Wie bist du darauf gekommen? Was ist dir unklar?" aria-label="Laut denken" onChange={(e) => setDenken(e.target.value)} />
            : <button type="button" className="btn small ghost tc-think" onClick={() => setThink(true)}><Ic name="bulb" cls="ic xs" /> Laut denken (optional)</button>}
          <div className="tc-sure">
            <span className="small muted">Wie sicher bist du?</span>
            <div className="segs" role="radiogroup" aria-label="Sicherheit">{(Object.keys(SICHER_LBL) as Answer["sicher"][]).map((k) => <button key={k} type="button" role="radio" aria-checked={sicher === k} className={`seg ${sicher === k ? "on" : ""}`} onClick={() => setSicher(k)}>{SICHER_LBL[k]}</button>)}</div>
          </div>
          <div className="row tc-q-act">
            <button type="button" className="btn small ghost" disabled={busy} onClick={() => submit({ weissNicht: true, sicher: "unsicher" })}>Ich weiß es nicht</button>
            <span className="spacer" />
            <button type="button" className="btn primary" disabled={busy || !ready} onClick={() => submit(q.art === "auswahl" ? { wahl: wahl! } : { text })} title={ready ? "" : "Antwort und Sicherheit wählen"}><Ic name="right" cls="ic xs" /> Antworten</button>
          </div>
        </div>
      ) : antwort && (
        <div className="tc-given small">
          {skipped ? <span className="muted">Übersprungen für eine Rückfrage</span>
            : q.art === "frei" ? <><b>Deine Antwort</b><p className="tut-pre">{antwort.replace(/^Meine Antwort: /, "").replace(/\nSicherheit:[\s\S]*$/, "")}</p></>
            : meta?.weissNicht ? <span className="muted">Nicht gewusst – richtig ist {L[q.richtig!]}.</span>
            : meta?.correct ? <span className="ok-text">Richtig{meta.sicher !== "sicher" ? " (aber noch unsicher)" : ""}.</span>
            : <span className="warn-text">Leider falsch – richtig ist {L[q.richtig!]}.</span>}
          {meta && !skipped && <span className="chip" style={{ marginLeft: 8 }}>{SICHER_LBL[meta.sicher]}</span>}
        </div>
      )}
    </div>
  );
}

/** Eingabe für eigene Fragen an den Tutor (Enter sendet, Umschalt + Enter = neue Zeile) */
function Composer({ pending, busy, onSend }: { pending: boolean; busy: boolean; onSend: (t: string) => Promise<boolean> }) {
  const [t, setT] = useState("");
  const go = async () => { const v = t; if (!v.trim()) return; setT(""); if (!(await onSend(v))) setT(v); };
  return (
    <div className="tutor-input tc-composer">
      <textarea value={t} rows={1} placeholder={pending ? "Rückfrage zur Aufgabe … (die Frage oben beantwortest du in der Karte)" : "Frag den Tutor etwas oder schreib „weiter“ …"} aria-label="Nachricht an den Tutor"
        onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void go(); } }} />
      <button type="button" className="btn primary tc-send" disabled={busy || !t.trim()} aria-label="Senden" onClick={() => void go()}><Ic name="right" cls="ic sm" /></button>
    </div>
  );
}
