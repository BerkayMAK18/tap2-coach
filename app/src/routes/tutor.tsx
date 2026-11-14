/**
 * Prüfer-Tutor (Premium, vorerst nur Admin). Zwei Tabs:
 * - „Sitzung“: ohne laufende Sitzung die Themenwahl (Empfehlung aus dem Lehrplan); mit Sitzung zwei Spalten – links der
 *   Chat, rechts die Reiter „Aufgabe“ (Stellung, Operator, Punkte, Material) und „Dein Stand“ (Konzept-Graph des Themas).
 *   Auf dem Handy wechseln Chat, Aufgabe und Stand über Reiter.
 * - „Lehrplan“: deterministisch berechneter Plan bis zur Prüfung.
 *
 * Menüpunkt nur für Admin (Admin-Konto oder /tutor?premium=1 auf diesem Gerät). Die KI prüft der Server (app_metadata.role).
 */
import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TAP2, TOPICS, TP, allQ } from "@/content/catalog";
import { EXAM_DE } from "@/config";
import { inTeil } from "@/content/catalog";
import { buildGraph, weakest } from "@/lib/graph";
import { XP_TAG_MAX, xpToday } from "@/lib/tutor-state";
import { today } from "@/lib/dates";
import { useProgress } from "@/store/progress";
import { PREMIUM_KEY, isPremium, useTutor } from "@/store/tutor";
import { Ic } from "@/ui-main";
import { TutorChat } from "@/components/TutorChat";
import { TutorBridge } from "@/components/TutorBridge";
import { AufgabeView } from "@/components/tutor/AufgabeView";
import { LehrplanView } from "@/components/tutor/LehrplanView";
import { StandView, SyncNote } from "@/components/tutor/StandView";
import { LV, makeHandoff, pc, useGraphs, useLehrplan } from "@/components/tutor/shared";

export const Route = createFileRoute("/tutor")({ validateSearch: z.object({ premium: z.coerce.string().optional().catch(undefined) }), component: Tutor });

type Top = "sitzung" | "lehrplan";
type Side = "aufgabe" | "stand";
type Mob = "chat" | Side;

function Tutor() {
  const { premium } = Route.useSearch();
  const [ok, setOk] = useState(isPremium());
  useEffect(() => { if (premium === "1") { try { localStorage.setItem(PREMIUM_KEY, "1"); } catch { /* privat */ } setOk(true); } }, [premium]);
  const [top, setTop] = useState<Top>("sitzung");
  const syncNow = useTutor((s) => s.syncNow);
  useEffect(() => { if (ok) void syncNow(); }, [ok, syncNow]);
  if (!ok) return <section className="card"><h3>Diese Seite ist nicht verfügbar.</h3><p className="small muted"><Link to="/">Zur Übersicht</Link></p></section>;
  return (
    <div className="tp-page">
      <div className="segs tp-top" role="tablist" aria-label="Tutor">
        {([["sitzung", "Sitzung"], ["lehrplan", "Lehrplan"]] as [Top, string][]).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={top === k} className={`seg ${top === k ? "on" : ""}`} onClick={() => setTop(k)}>{l}</button>)}
      </div>
      {top === "lehrplan" ? <PlanTab onStarted={() => setTop("sitzung")} /> : <SessionTab />}
    </div>
  );
}

/** Sitzung starten (aus Themenwahl oder Lehrplan) */
function useStart() {
  const graphs = useGraphs(), S = useProgress((s) => s.S), { state, start } = useTutor();
  return (tid: string, fokus?: string[]) => {
    const g = graphs.get(tid); if (!g) return Promise.resolve(false);
    return start(tid, makeHandoff(tid, S, state, g, fokus ?? weakest(g, 3).map((c) => c.id)));
  };
}

function PlanTab({ onStarted }: { onStarted: () => void }) {
  const plan = useLehrplan(), start = useStart(), { busy, err, convo } = useTutor();
  return (
    <>
      {err && <p className="small warn-text" role="alert">{err}</p>}
      <LehrplanView plan={plan} busy={busy} onStart={(tid, fokus) => {
        if (convo && !convo.ende && !confirm("Die laufende Sitzung wird beendet. Neue Sitzung starten?")) return;
        void start(tid, fokus).then((r) => r && onStarted());
      }} />
    </>
  );
}

function SessionTab() {
  const convo = useTutor((s) => s.convo), graphs = useGraphs();
  const [side, setSide] = useState<Side>("aufgabe"), [mob, setMob] = useState<Mob>("chat"), [shown, setShown] = useState<string | null>(null);
  if (!convo) return <Themenwahl />;
  const key = shown && convo.aufgaben[shown] ? shown : convo.offen ?? convo.order[convo.order.length - 1];
  const a = key ? convo.aufgaben[key] : undefined, r = key ? convo.bewertungen[key] : undefined;
  const g = graphs.get(convo.thema)!;
  const pick = (k: Side) => { setSide(k); setMob(k); };
  return (
    <div className={`tutor-shell m-${mob}`}>
      <div className="segs tutor-mtabs" role="tablist" aria-label="Sitzung">
        {([["chat", "Chat"], ["aufgabe", "Aufgabe"], ["stand", "Dein Stand"]] as [Mob, string][]).map(([k, l]) => <button key={k} type="button" role="tab" className={`seg ${mob === k ? "on" : ""}`} aria-selected={mob === k} onClick={() => (k === "chat" ? setMob("chat") : pick(k))}>{l}{k === "aufgabe" && convo.offen ? <i className="tutor-dot" aria-label="offen" /> : null}</button>)}
      </div>
      <section className="card tutor-main"><TutorChat onTask={(k) => { setShown(k); pick("aufgabe"); }} /></section>
      <aside className="card tutor-side" aria-label="Aufgabe und Stand">
        <div className="segs tutor-tabs" role="tablist">
          {([["aufgabe", "Aufgabe"], ["stand", "Dein Stand"]] as [Side, string][]).map(([k, l]) => <button key={k} type="button" role="tab" className={`seg ${side === k ? "on" : ""}`} aria-selected={side === k} onClick={() => pick(k)}>{l}{k === "aufgabe" && convo.offen ? <i className="tutor-dot" aria-label="offen" /> : null}</button>)}
        </div>
        <div className="tutor-side-b">
          {side === "aufgabe" ? <AufgabeView a={a} b={r?.b} xp={r?.xp} sich={r?.sich} onChat={() => setMob("chat")} /> : <StandView g={g} />}
        </div>
      </aside>
    </div>
  );
}

/** Themenwahl: alle Katalogthemen nach Prüfungsteil, Empfehlung aus dem Lehrplan */
function Themenwahl() {
  const graphs = useGraphs(), plan = useLehrplan(), start = useStart(), { busy, err, model, setModel, state } = useTutor();
  const rec = plan.empfehlung?.kind === "sitzung" ? plan.empfehlung : null;
  const xpHeute = xpToday(state, today());
  const TEILE: [string, "t1" | "t2" | "wiso"][] = [["Teil 2", "t2"], ["Teil 1", "t1"], ["WiSo", "wiso"]];
  const seen = new Set<string>();
  return (
    <div className="tp-pick">
      <section className="card tp-hero">
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <span className="tc-ava" aria-hidden="true"><Ic name="sparkles" cls="ic sm" /></span>
          <div style={{ flex: 1, minWidth: 220 }}><h2 style={{ margin: 0 }}>Prüfungstraining mit dem KI-Tutor</h2><p className="small muted" style={{ margin: "4px 0 0" }}>Wähle ein Thema – der Tutor löchert dich eine ganze Sitzung lang mit Aufgaben im IHK-Stil und bewertet wie ein Prüfer mit Teilpunkten. Prüfung am {EXAM_DE}.</p></div>
          <div className="segs" role="group" aria-label="Modell">{(["sonnet", "haiku"] as const).map((m) => <button key={m} type="button" className={`seg ${model === m ? "on" : ""}`} aria-pressed={model === m} onClick={() => setModel(m)}>{m === "sonnet" ? "Gründlich (Sonnet)" : "Schnell (Haiku)"}</button>)}</div>
        </div>
        {rec && (
          <div className="tp-rec">
            <div><span className="eyebrow">Empfehlung aus deinem Lehrplan</span><b>{rec.name}</b><p className="tiny muted" style={{ margin: "2px 0 0" }}>{rec.grund}{rec.fokus.length ? ` · Fokus: ${rec.fokus.map((f) => f.label).join(", ")}` : ""}</p></div>
            <button type="button" className="btn primary" disabled={busy} onClick={() => void start(rec.topic, rec.fokus.map((f) => f.id))}><Ic name="play" cls="ic xs" /> Sitzung starten</button>
          </div>
        )}
        {err && <p className="small warn-text" role="alert" style={{ margin: "10px 0 0" }}>{err}</p>}
        {busy && <p className="small muted" style={{ margin: "10px 0 0" }}>Der Tutor bereitet die erste Aufgabe vor …</p>}
        <p className="tiny muted" style={{ margin: "10px 0 0" }}>Tutor-XP heute: {xpHeute} von {XP_TAG_MAX} · jede bewertete Aufgabe zählt für Serie und Tagesziele.</p>
      </section>
      {TEILE.map(([label, part]) => {
        const list = TOPICS.filter((t) => inTeil(t, part) && !seen.has(t.id)); list.forEach((t) => seen.add(t.id));
        if (!list.length) return null;
        return (
          <section key={part} className="card">
            <h3>{label}</h3>
            <ul className="tp-topics">
              {list.map((t) => { const g = graphs.get(t.id)!, fv = g.miscon.filter((m) => m.active).length; return (
                <li key={t.id}>
                  <button type="button" className={`tp-topic ${rec?.topic === t.id ? "rec" : ""}`} disabled={busy} onClick={() => void start(t.id)}>
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
      <section className="card"><SyncNote />
        <details className="tx-paste"><summary className="small">Alternative ohne API: über ein Claude-Projekt (Kopieren)</summary><Bridge /></details>
      </section>
    </div>
  );
}

function Bridge() { const S = useProgress((s) => s.S); return <TutorBridge g={buildGraph(S, TOPICS, TAP2.pakete, allQ(S))} />; }
