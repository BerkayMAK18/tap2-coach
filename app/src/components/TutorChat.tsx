/**
 * Prüfer-Tutor – Chat (linke Spalte): Verlauf der Sitzung und Eingabe „Deine Antwort oder Frage“ mit den optionalen
 * Feldern „Gedankengang“ (Hilfe für den Tutor, keine Antwort) und „Sicherheit“, dazu „Ich stehe auf dem Schlauch“
 * (kleinerer Teilschritt statt Lösung). Aufgaben und Bewertungen erscheinen als Karten; das Material steht im Reiter
 * „Aufgabe“. KI-Text nur über SafeMarkdown, nie als HTML.
 */
import { useEffect, useRef, useState } from "react";
import { feedOf, SICHER, type Feed, type Model, type Sicher } from "@/lib/tutor-session";
import { supabase } from "@/lib/supabase";
import { useAccount } from "@/store/account";
import { useProgress } from "@/store/progress";
import { IDS, useTutor } from "@/store/tutor";
import { Ic } from "@/ui-main";
import { ask } from "@/ui-main/ask";
import { SafeMarkdown } from "./SafeMarkdown";
import { BewertungView, OpChip } from "./tutor/AufgabeView";
import { fmt, kernLabel, makeHandoff, tn, useGraphs } from "./tutor/shared";
import { weakest } from "@/lib/graph";

const MODEL_LBL: Record<Model, string> = { sonnet: "Sonnet", haiku: "Haiku" };
const ART: Record<string, string> = { beleg: "sitzt", luecke: "Lücke", fehlvorstellung: "Fehlvorstellung", behoben: "ausgeräumt" };

export function TutorChat() {
  const user = useAccount((s) => s.user), signIn = useAccount((s) => s.signIn);
  const { convo, busy, err, send, close, model, setModel } = useTutor();
  const end = useRef<HTMLDivElement>(null);
  const feed = convo ? feedOf(convo, IDS) : [];
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [convo?.msgs.length, busy]);
  if (!convo) return null;
  const done = Object.values(convo.bewertungen), pts = done.reduce((s, x) => s + x.b.punkte, 0), max = done.reduce((s, x) => s + x.b.max, 0), xp = done.reduce((s, x) => s + x.xp, 0);

  const blocked = !supabase ? <p className="small muted">Der Tutor braucht den Server (Supabase). In dieser Umgebung ist er nicht eingerichtet.</p>
    : !user ? <div className="row"><p className="small muted" style={{ margin: 0 }}>Der Tutor läuft über dein Konto. Bitte einmal mit GitHub anmelden.</p><button type="button" className="btn small primary" onClick={() => void signIn()}><Ic name="users" cls="ic xs" /> Mit GitHub anmelden</button></div>
    : null;

  return (
    <div className="tutor-chat">
      <div className="tutor-head">
        <div className="tc-title"><span className="tc-ava" aria-hidden="true"><Ic name="sparkles" cls="ic sm" /></span><div><b>{tn(convo.thema)}</b><span className="tiny muted">{convo.msgs.length ? MODEL_LBL[convo.model] : "noch nicht gestartet"} · {done.length} bewertet{max ? ` · ${fmt(pts)}/${fmt(max)} P.` : ""}{xp ? ` · +${xp} XP` : ""}</span></div></div>
        <span className="spacer" />
        <span className="tiny muted tp-cost" title={`Schätzung aus dem gemeldeten Verbrauch · ${MODEL_LBL[convo.model]}`}>≈ {convo.cost.toFixed(3)} $</span>
        {!convo.msgs.length && <div className="segs" role="group" aria-label="Modell">{(["sonnet", "haiku"] as Model[]).map((m) => <button key={m} type="button" className={`seg ${model === m ? "on" : ""}`} aria-pressed={model === m} onClick={() => setModel(m)}>{MODEL_LBL[m]}</button>)}</div>}
        {!convo.ende && convo.msgs.length > 0 && <button type="button" className="btn small ghost" disabled={busy || !!blocked} title="Der Tutor schließt mit Fazit und nächstem Schritt ab" onClick={() => void send({ kind: "ende" })}><Ic name="flag" cls="ic xs" /> Beenden</button>}
        <button type="button" className="btn small ghost" disabled={busy} aria-label="Sitzung schließen" title="Sitzung schließen (dein Stand bleibt)" onClick={() => void (async () => { if (!convo.msgs.length || convo.ende || await ask({ title: "Sitzung schließen?", text: "Der Verlauf dieser Sitzung wird gelöscht. Dein Stand im Graphen und deine XP bleiben erhalten.", ok: "Schließen", danger: true })) close(); })()}><Ic name="x" cls="ic xs" /></button>
      </div>
      <div className="tutor-msgs" aria-live="polite">
        {!convo.msgs.length && (
          <div className="tc-row"><span className="tc-ava sm" aria-hidden="true"><Ic name="sparkles" cls="ic xs" /></span><div className="tc-bubble">
            <p><b>{tn(convo.thema)}</b> – bereit, wenn du es bist.</p>
            <p className="small muted">Schreib deine erste Nachricht, z. B. „Los geht's“ oder was dir bei dem Thema schwerfällt. Erst dann bekommt der Tutor deinen Stand und stellt die erste Aufgabe – vorher entstehen keine Kosten.</p>
          </div></div>
        )}
        {feed.map((f, n) => <FeedItem key={n} f={f} />)}
        {busy && <div className="tc-row"><span className="tc-ava sm" aria-hidden="true"><Ic name="sparkles" cls="ic xs" /></span><div className="tc-bubble tc-typing" aria-label="Tutor schreibt"><i /><i /><i /></div></div>}
        <div ref={end} />
      </div>
      {err && <p className="small warn-text tutor-err" role="alert">{err}</p>}
      {blocked ? <div className="tutor-input">{blocked}</div> : <Composer busy={busy} offen={!!convo.offen} first={!convo.msgs.length} />}
    </div>
  );
}

function FeedItem({ f }: { f: Feed }) {
  const convo = useTutor((s) => s.convo)!;
  switch (f.k) {
    case "start": return <div className="tc-note"><Ic name="layers" cls="ic xs" /> Stand und Lernpakete an den Tutor übergeben</div>;
    case "me": {
      const m = f.meta;
      return (
        <div className="tc-row me"><div className="tc-bubble me">
          {m.kind === "schlauch" ? <p className="tut-pre"><b>Ich stehe auf dem Schlauch.</b>{m.text ? "\n" + m.text : ""}</p>
            : m.kind === "ende" ? <p className="tut-pre">Sitzung beenden</p>
            : <p className="tut-pre">{m.text}</p>}
          {(m.gedanke || m.sich != null) && <p className="tp-meta">{m.sich != null && <span>Sicherheit: {SICHER[m.sich]}</span>}{m.gedanke && <span>Gedankengang: {m.gedanke}</span>}</p>}
        </div></div>
      );
    }
    case "tutor": return <div className="tc-row"><span className="tc-ava sm" aria-hidden="true"><Ic name="sparkles" cls="ic xs" /></span><div className="tc-bubble"><SafeMarkdown text={f.text} /></div></div>;
    case "aufgabe": {
      const done = !!convo.bewertungen[f.key];
      return (
        <div className={`tc-card tc-q ${convo.offen === f.key ? "open" : ""}`}>
          <div className="row tc-q-h"><span className="chip">Aufgabe {f.a.id}</span><OpChip op={f.a.operator} /><span className="chip blue">{f.a.punkte} P.</span>{done && <span className="chip ok">bewertet</span>}</div>
          <b className="tp-card-t">{f.a.titel}</b>
          <div className="qtext tc-qtext"><SafeMarkdown text={f.a.stellung} /></div>
          {f.a.material.length > 0 && <p className="tiny muted" style={{ margin: "6px 0 0" }}>{f.a.material.length} Material{f.a.material.length > 1 ? "ien" : ""} im Reiter „Aufgabe“</p>}
        </div>
      );
    }
    case "bewertung": { const r = convo.bewertungen[f.key]; return <div className="tc-card"><p className="tiny muted" style={{ margin: "0 0 6px" }}>Bewertung · {f.titel}</p><BewertungView b={f.b} xp={r?.xp} sich={r?.sich} /></div>; }
    case "graph": return (
      <div className="tc-note tp-gnote" title={f.items.map((g) => g.notiz || g.fehlvorstellung || "").filter(Boolean).join(" · ")}>
        <Ic name="diagram" cls="ic xs" /> {f.items.map((g) => `${kernLabel(g.konzept)}: ${ART[g.art]}`).join(" · ")}
      </div>
    );
    case "ende": return <div className="tc-card tc-done"><div className="row"><Ic name="trophy" cls="ic sm" /><b>Sitzung abgeschlossen</b></div><p className="small" style={{ margin: "6px 0 0" }}>{f.fazit}</p>{f.naechstes && <p className="small muted" style={{ margin: "4px 0 0" }}>Als Nächstes: {f.naechstes}</p>}</div>;
  }
}

/** Eingabe: Antwort oder Frage (Enter sendet, Umschalt + Enter = neue Zeile), optional Gedankengang und Sicherheit */
function Composer({ busy, offen, first }: { busy: boolean; offen: boolean; first: boolean }) {
  const send = useTutor((s) => s.send), graphs = useGraphs(), S = useProgress((s) => s.S);
  /** Übergabe für die erste Nachricht: Stand, Fehlvorstellungen und Lernpakete des Themas (erst beim Senden berechnet) */
  const handoff = () => { const { convo, state } = useTutor.getState(), g = graphs.get(convo!.thema)!; return makeHandoff(convo!.thema, S, state, g, convo!.fokus ?? weakest(g, 3).map((c) => c.id)); };
  const [t, setT] = useState(""), [ged, setGed] = useState(""), [showGed, setShowGed] = useState(false), [sich, setSich] = useState<Sicher | null>(null);
  const reset = () => { setT(""); setGed(""); setShowGed(false); setSich(null); };
  const go = async () => {
    if (!t.trim() || busy) return;
    const meta = { kind: "antwort" as const, text: t, ...(ged.trim() ? { gedanke: ged } : {}), ...(sich != null ? { sich } : {}) };
    const keep = { t, ged, sich }; reset();
    if (!(await send(meta, handoff))) { setT(keep.t); setGed(keep.ged); setSich(keep.sich); if (keep.ged) setShowGed(true); }
  };
  const stuck = async () => { const keep = t; setT(""); if (!(await send({ kind: "schlauch", ...(keep.trim() ? { text: keep } : {}) }))) setT(keep); };
  return (
    <div className="tutor-input tp-composer">
      <textarea value={t} rows={2} placeholder={first ? "Deine erste Nachricht, z. B. „Los geht's“" : "Deine Antwort oder Frage"} aria-label="Deine Antwort oder Frage"
        onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void go(); } }} />
      {!first && showGed && <textarea value={ged} rows={2} placeholder="Gedankengang: Warum hast du so geantwortet? (Hilfe für den Tutor, keine Antwort)" aria-label="Gedankengang (optional)" onChange={(e) => setGed(e.target.value)} />}
      {!first && <div className="tp-comp-row">
        {!showGed && <button type="button" className="btn small ghost" title="Optional: warum du so geantwortet hast – hilft dem Tutor, dein Denken zu verstehen" onClick={() => setShowGed(true)}><Ic name="bulb" cls="ic xs" /> Gedankengang</button>}
        <div className="segs tp-sure" role="radiogroup" aria-label="Sicherheit (optional)" title="Optional: Wie sicher bist du dir?">
          {SICHER.map((l, i) => <button key={l} type="button" role="radio" aria-checked={sich === i} className={`seg ${sich === i ? "on" : ""}`} onClick={() => setSich(sich === i ? null : (i as Sicher))}>{l}</button>)}
        </div>
      </div>}
      <div className="tp-comp-row">
        {!first && <button type="button" className="btn small" disabled={busy || !offen} title={offen ? "Kleinerer Teilschritt statt der Lösung" : "Erst wenn eine Aufgabe offen ist"} onClick={() => void stuck()}>Ich stehe auf dem Schlauch</button>}
        <button type="button" className="btn primary" disabled={busy || !t.trim()} aria-label="Senden" onClick={() => void go()}><Ic name="right" cls="ic xs" /><span className="tp-send-l"> Senden</span></button>
      </div>
    </div>
  );
}
