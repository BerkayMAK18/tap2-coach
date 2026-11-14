/**
 * Prüfer-Tutor (Premium, vorerst nur Admin). Zwei Tabs:
 * - „Sitzung“: ohne Sitzung die Themenwahl (Empfehlung aus dem Lehrplan). Ein Klick öffnet nur den Chat zum Thema –
 *   die KI wird erst mit der ersten Nachricht gefragt (keine Kosten fürs Hineinschauen). Mit Sitzung zwei Spalten:
 *   links der Chat, rechts die Reiter „Aufgabe“ (Stellung, Operator, Punkte, Material) und „Dein Stand“ (Konzept-Graph).
 *   Auf dem Handy wechseln Chat, Aufgabe und Stand über Reiter.
 * - „Lehrplan“: deterministisch berechneter Plan bis zur Prüfung.
 *
 * Premium: nur das freigeschaltete GitHub-Konto (app_metadata.role = "admin"), auf jedem Gerät, auf dem es angemeldet ist.
 * Andere sehen „gesperrt“. Maßgeblich ist die Prüfung im Server (Edge Function), die Ansicht folgt ihr nur.
 */
import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { TAP2, TOPICS, TP, allQ } from "@/content/catalog";
import { EXAM_DE } from "@/config";
import { buildGraph } from "@/lib/graph";
import { xpToday } from "@/lib/tutor-state";
import { today } from "@/lib/dates";
import { useProgress } from "@/store/progress";
import { useTutor } from "@/store/tutor";
import { isAdmin, useAccount } from "@/store/account";
import { Ic } from "@/ui-main";
import { ask } from "@/ui-main/ask";
import { TutorChat } from "@/components/TutorChat";
import { TutorBridge } from "@/components/TutorBridge";
import { AufgabeView } from "@/components/tutor/AufgabeView";
import { LehrplanView } from "@/components/tutor/LehrplanView";
import { ResetTutor, StandView, SyncNote } from "@/components/tutor/StandView";
import { LV, pc, useGraphs, useLehrplan } from "@/components/tutor/shared";

export const Route = createFileRoute("/tutor")({ component: Tutor });

type Top = "sitzung" | "lehrplan";
type Side = "aufgabe" | "stand";
type Mob = "chat" | Side;

function Tutor() {
  const ok = useAccount((s) => isAdmin(s.user)), ready = useAccount((s) => s.ready), signedIn = useAccount((s) => !!s.user), signIn = useAccount((s) => s.signIn);
  const [top, setTop] = useState<Top>("sitzung");
  const syncNow = useTutor((s) => s.syncNow);
  useEffect(() => { if (ok) void syncNow(); }, [ok, syncNow]);
  if (!ok) return !ready ? <section className="card"><p className="small muted">Anmeldung wird geprüft …</p></section> : (
    <section className="card tp-locked">
      <span className="tc-ava" aria-hidden="true"><Ic name="lock" cls="ic sm" /></span>
      <div><h3 style={{ margin: 0 }}>KI-Tutor · Premium</h3>
        <p className="small muted" style={{ margin: "4px 0 0" }}>{signedIn ? "Der KI-Tutor ist für dein Konto nicht freigeschaltet." : "Der KI-Tutor ist eine Premium-Funktion. Melde dich mit dem freigeschalteten GitHub-Konto an."}</p>
        <div className="row" style={{ marginTop: 12 }}>{!signedIn && <button type="button" className="btn small primary" onClick={() => void signIn()}><Ic name="users" cls="ic xs" /> Mit GitHub anmelden</button>}<Link className="btn small ghost" to="/">Zur Übersicht</Link></div>
      </div>
    </section>
  );
  return (
    <div className="tp-page">
      <div className="segs tp-top" role="tablist" aria-label="Tutor">
        {([["sitzung", "Sitzung"], ["lehrplan", "Lehrplan"]] as [Top, string][]).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={top === k} className={`seg ${top === k ? "on" : ""}`} onClick={() => setTop(k)}>{l}</button>)}
      </div>
      {top === "lehrplan" ? <PlanTab onStarted={() => setTop("sitzung")} /> : <SessionTab />}
    </div>
  );
}

function PlanTab({ onStarted }: { onStarted: () => void }) {
  const plan = useLehrplan(), { busy, err, convo, open } = useTutor();
  return (
    <>
      {err && <p className="small warn-text" role="alert">{err}</p>}
      <LehrplanView plan={plan} busy={busy} onStart={(tid, fokus) => void (async () => {
        if (convo?.msgs.length && !convo.ende && !(await ask({ title: "Neue Sitzung öffnen?", text: "Die laufende Sitzung wird beendet. Dein Stand und deine XP bleiben erhalten.", ok: "Neue Sitzung" }))) return;
        open(tid, fokus); onStarted();
      })()} />
    </>
  );
}

function SessionTab() {
  const convo = useTutor((s) => s.convo), graphs = useGraphs();
  const [side, setSide] = useState<Side | null>(null), [mob, setMob] = useState<Mob>("chat");
  if (!convo) return <Themenwahl />;
  const cur = side ?? (convo.offen ? "aufgabe" : "stand"); // ohne Aufgabe zuerst der Stand
  const key = convo.offen ?? convo.order[convo.order.length - 1];
  const a = key ? convo.aufgaben[key] : undefined, r = key ? convo.bewertungen[key] : undefined;
  const g = graphs.get(convo.thema)!;
  const pick = (k: Side) => { setSide(k); setMob(k); };
  return (
    <div className={`tutor-shell m-${mob}`}>
      <div className="segs tutor-mtabs" role="tablist" aria-label="Sitzung">
        {([["chat", "Chat"], ["aufgabe", "Aufgabe"], ["stand", "Dein Stand"]] as [Mob, string][]).map(([k, l]) => <button key={k} type="button" role="tab" className={`seg ${mob === k ? "on" : ""}`} aria-selected={mob === k} onClick={() => (k === "chat" ? setMob("chat") : pick(k))}>{l}{k === "aufgabe" && convo.offen ? <i className="tutor-dot" aria-label="offen" /> : null}</button>)}
      </div>
      <section className="card tutor-main"><TutorChat /></section>
      <aside className="card tutor-side" aria-label="Aufgabe und Stand">
        <div className="segs tutor-tabs" role="tablist">
          {([["aufgabe", "Aufgabe"], ["stand", "Dein Stand"]] as [Side, string][]).map(([k, l]) => <button key={k} type="button" role="tab" className={`seg ${cur === k ? "on" : ""}`} aria-selected={cur === k} onClick={() => pick(k)}>{l}{k === "aufgabe" && convo.offen ? <i className="tutor-dot" aria-label="offen" /> : null}</button>)}
        </div>
        <div className="tutor-side-b">
          {cur === "aufgabe" ? <AufgabeView a={a} b={r?.b} xp={r?.xp} sich={r?.sich} onChat={() => setMob("chat")} /> : <StandView g={g} />}
        </div>
      </aside>
    </div>
  );
}

/** Themenwahl: alle Katalogthemen nach Prüfungsteil, Empfehlung aus dem Lehrplan */
function Themenwahl() {
  const graphs = useGraphs(), plan = useLehrplan(), { busy, err, model, setModel, state, open } = useTutor();
  const rec = plan.empfehlung?.kind === "sitzung" ? plan.empfehlung : null;
  const xpHeute = xpToday(state, today());
  // Reihenfolge: Teil 1, Teil 2, Teil 1 + 2, WiSo (Prüfungsteil laut Katalog)
  const TEILE: [string, string][] = [["Teil 1", "Teil 1"], ["Teil 2", "Teil 2"], ["Teil 1 + 2", "Teil 1 + 2"], ["WiSo", "SoWi"]];
  return (
    <div className="tp-pick">
      <section className="card tp-hero">
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <span className="tc-ava" aria-hidden="true"><Ic name="sparkles" cls="ic sm" /></span>
          <div style={{ flex: 1, minWidth: 220 }}><h2 style={{ margin: 0 }}>Prüfungstraining mit dem KI-Tutor</h2><p className="small muted" style={{ margin: "4px 0 0" }}>Wähle ein Thema – der Chat öffnet sich. Sobald du deine erste Nachricht schreibst, löchert dich der Tutor eine ganze Sitzung lang mit Aufgaben im IHK-Stil und bewertet wie ein Prüfer mit Teilpunkten. Prüfung am {EXAM_DE}.</p></div>
          <div className="segs" role="group" aria-label="Modell">{(["sonnet", "haiku"] as const).map((m) => <button key={m} type="button" className={`seg ${model === m ? "on" : ""}`} aria-pressed={model === m} onClick={() => setModel(m)}>{m === "sonnet" ? "Gründlich (Sonnet)" : "Schnell (Haiku)"}</button>)}</div>
        </div>
        {rec && (
          <div className="tp-rec">
            <div><span className="eyebrow">Empfehlung aus deinem Lehrplan</span><b>{rec.name}</b><p className="tiny muted" style={{ margin: "2px 0 0" }}>{rec.grund}{rec.fokus.length ? ` · Fokus: ${rec.fokus.map((f) => f.label).join(", ")}` : ""}</p></div>
            <button type="button" className="btn primary" disabled={busy} onClick={() => open(rec.topic, rec.fokus.map((f) => f.id))}><Ic name="play" cls="ic xs" /> Öffnen</button>
          </div>
        )}
        {err && <p className="small warn-text" role="alert" style={{ margin: "10px 0 0" }}>{err}</p>}
        <p className="tiny muted" style={{ margin: "10px 0 0" }}>Tutor-XP heute: {xpHeute} · jede bewertete Aufgabe zählt wie eine Antwort: XP mit Combo, Serie und Tagesziele (richtig ab der Hälfte der Punkte).</p>
      </section>
      {TEILE.map(([label, part]) => {
        const list = TOPICS.filter((t) => t.teil === part);
        if (!list.length) return null;
        return (
          <section key={part} className="card">
            <h3>{label}</h3>
            <ul className="tp-topics">
              {list.map((t) => { const g = graphs.get(t.id)!, fv = g.miscon.filter((m) => m.active).length; return (
                <li key={t.id}>
                  <button type="button" className={`tp-topic ${rec?.topic === t.id ? "rec" : ""}`} disabled={busy} onClick={() => open(t.id)}>
                    <span className="tp-topic-n">{TP[t.id].n}</span>
                    <span className="tp-topic-m">{t.prio === "Muss" && <span className="chip muss">Muss</span>}<span className={`chip ${LV[g.level].chip}`}>{LV[g.level].label} · {pc(g.m)}</span>{fv > 0 && <span className="chip red">{fv} Fehlvorst.</span>}</span>
                    <span className="bar tc-mini"><i style={{ width: `${Math.round((g.m ?? 0) * 100)}%`, background: LV[g.level].fill }} /></span>
                  </button>
                </li>
              ); })}
            </ul>
          </section>
        );
      })}
      <section className="card"><SyncNote /><ResetTutor />
        <details className="tx-paste"><summary className="small">Alternative ohne API: über ein Claude-Projekt (Kopieren)</summary><Bridge /></details>
      </section>
    </div>
  );
}

function Bridge() { const S = useProgress((s) => s.S); return <TutorBridge g={buildGraph(S, TOPICS, TAP2.pakete, allQ(S))} />; }
