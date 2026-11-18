/**
 * Tutor – Prüfungstutor für die TAP2. Wege:
 * - In der App (nur mit Anmeldung): Chat mit Aufgabe und Bewertung – „Tutor Pro“ (Claude) für das freigeschaltete Konto,
 *   sonst der kostenlose KI-Tutor (Gratis-Stufe eines anderen Anbieters, einfacheres Modell).
 * - Mit eigener KI (für alle, auch ohne Anmeldung): Brücke (components/tutor/BridgePanel.tsx).
 * Beide teilen Themenwahl, Lehrplan und Graph (Tutor-Stand). Zwei Tabs:
 * - „Sitzung“: ohne Sitzung die Themenwahl (Empfehlung aus dem Lehrplan). Ein Klick öffnet nur den Chat zum Thema –
 *   die KI wird erst mit der ersten Nachricht gefragt (keine Kosten fürs Hineinschauen). Mit Sitzung zwei Spalten:
 *   links der Chat, rechts die Reiter „Aufgabe“ (Stellung, Operator, Punkte, Material) und „Dein Stand“ (Konzept-Graph).
 *   Auf dem Handy wechseln Chat, Aufgabe und Stand über Reiter.
 * - „Lehrplan“: deterministisch berechneter Plan bis zur Prüfung.
 *
 * Zugang vorerst nur für das freigeschaltete GitHub-Konto (app_metadata.role = "admin", „Tutor Pro“ mit Claude) –
 * Menüpunkt und Seite sind für alle anderen unsichtbar (16.11.2026), auch der kostenlose Weg und die Brücke.
 * Maßgeblich für die KI ist die Prüfung im Server (Edge Function), die Ansicht folgt ihr nur.
 */
import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { TOPICS, TP } from "@/content/catalog";
import { formatExamDate } from "@/lib/exam-date";
import { xpToday } from "@/lib/tutor-state";
import { today } from "@/lib/dates";
import { useTutor } from "@/store/tutor";
import { isAdmin, useAccount } from "@/store/account";
import { useLearningArea } from "@/store/learning-area";
import { useExamDay } from "@/store/exam-date";
import { supabase } from "@/lib/supabase";
import { Ic } from "@/ui-main";
import { ask } from "@/ui-main/ask";
import { TutorChat } from "@/components/TutorChat";
import { BridgePanel } from "@/components/tutor/BridgePanel";
import { AufgabeView } from "@/components/tutor/AufgabeView";
import { LehrplanView } from "@/components/tutor/LehrplanView";
import { ResetTutor, StandView, SyncNote } from "@/components/tutor/StandView";
import { LV, pc, useGraphs, useLehrplan } from "@/components/tutor/shared";

export const Route = createFileRoute("/tutor")({ component: Tutor });

type Top = "sitzung" | "lehrplan";
type Side = "aufgabe" | "stand";
/** In der App (Tutor Pro für den Admin, sonst kostenloser KI-Tutor; nur mit Anmeldung) oder Brücke zur eigenen KI */
type Way = "app" | "bruecke";
const KEY_WAY = "tap2coach-tutor-weg";
const readWay = (): Way => { try { return localStorage.getItem(KEY_WAY) === "bruecke" ? "bruecke" : "app"; } catch { return "app"; } };
type Mob = "chat" | Side;

function Tutor() {
  const pro = useAccount((s) => isAdmin(s.user)), ready = useAccount((s) => s.ready), signedIn = useAccount((s) => !!s.user);
  const area = useLearningArea((s) => s.area);
  const [top, setTop] = useState<Top>("sitzung"), [stored, setStored] = useState<Way>(readWay);
  const syncNow = useTutor((s) => s.syncNow);
  useEffect(() => { void syncNow(); }, [syncNow]);
  if (area === "fisi") return <section className="card"><h2>Tutor</h2><p className="muted">Der Prüfungstutor ist derzeit auf Anwendungsentwicklung ausgerichtet. Für Systemintegration ist er noch nicht freigeschaltet.</p></section>;
  if (supabase && !ready) return <section className="card"><p className="small muted">Anmeldung wird geprüft …</p></section>;
  if (!pro) return <section className="card"><h3>Diese Seite ist nicht verfügbar.</h3><p className="small muted"><Link to="/">Zur Übersicht</Link></p></section>;
  const inApp = signedIn && stored === "app"; // ohne Anmeldung nur die Brücke
  const setWay = (w: Way) => { setStored(w); try { localStorage.setItem(KEY_WAY, w); } catch { /* privat */ } };
  const way = { pro, inApp, signedIn, setWay };
  return (
    <div className="tp-page">
      <div className="row tp-topbar">
        <div className="segs tp-top" role="tablist" aria-label="Tutor">
          {([["sitzung", "Sitzung"], ["lehrplan", "Lehrplan"]] as [Top, string][]).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={top === k} className={`seg ${top === k ? "on" : ""}`} onClick={() => setTop(k)}>{l}</button>)}
        </div>
        <span className="spacer" />
        <span className={`chip ${pro && inApp ? "violet" : ""}`}>{pro && inApp ? "Tutor Pro" : inApp ? "Tutor · kostenlos" : "Tutor · eigene KI"}</span>
      </div>
      {top === "lehrplan" ? <PlanTab inApp={inApp} onStarted={() => setTop("sitzung")} /> : inApp ? <SessionTab way={way} /> : <FreeTab way={way} />}
    </div>
  );
}
type WayProps = { pro: boolean; inApp: boolean; signedIn: boolean; setWay: (w: Way) => void };

function PlanTab({ inApp, onStarted }: { inApp: boolean; onStarted: () => void }) {
  const plan = useLehrplan(), { busy, err, convo, open, openBridge } = useTutor();
  return (
    <>
      {err && <p className="small warn-text" role="alert">{err}</p>}
      <LehrplanView plan={plan} busy={busy} onStart={(tid, fokus) => void (async () => {
        if (!inApp) { openBridge(tid, fokus); onStarted(); return; }
        if (convo?.msgs.length && !convo.ende && !(await ask({ title: "Neue Sitzung öffnen?", text: "Die laufende Sitzung wird beendet. Dein Stand und deine XP bleiben erhalten.", ok: "Neue Sitzung" }))) return;
        open(tid, fokus); onStarted();
      })()} />
    </>
  );
}

/** Tutor (kostenlos): links die Brücke zur eigenen KI, rechts „Dein Stand“; ohne Thema die Themenwahl */
function FreeTab({ way }: { way: WayProps }) {
  const bridge = useTutor((s) => s.bridge), graphs = useGraphs(), [mob, setMob] = useState<"chat" | "stand">("chat");
  if (!bridge) return <Themenwahl way={way} />;
  return (
    <div className={`tutor-shell m-${mob}`}>
      <div className="segs tutor-mtabs" role="tablist" aria-label="Tutor">
        {([["chat", "Tutor"], ["stand", "Dein Stand"]] as const).map(([k, l]) => <button key={k} type="button" role="tab" className={`seg ${mob === k ? "on" : ""}`} aria-selected={mob === k} onClick={() => setMob(k)}>{l}</button>)}
      </div>
      <section className="card tutor-main"><BridgePanel /></section>
      <aside className="card tutor-side" aria-label="Dein Stand">
        <div className="tutor-side-b" style={{ marginTop: 0 }}><StandView g={graphs.get(bridge.thema)!} /></div>
      </aside>
    </div>
  );
}

function SessionTab({ way }: { way: WayProps }) {
  const convo = useTutor((s) => s.convo), graphs = useGraphs();
  const [side, setSide] = useState<Side | null>(null), [mob, setMob] = useState<Mob>("chat");
  if (!convo) return <Themenwahl way={way} />;
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
function Themenwahl({ way }: { way: WayProps }) {
  const { pro, inApp, signedIn, setWay } = way, signIn = useAccount((s) => s.signIn);
  const examLabel = formatExamDate(useExamDay());
  const graphs = useGraphs(), plan = useLehrplan(), { busy, err, model, setModel, state, open: openApp, openBridge } = useTutor();
  const open = inApp ? openApp : openBridge;
  const rec = plan.empfehlung?.kind === "sitzung" ? plan.empfehlung : null;
  const xpHeute = xpToday(state, today());
  // Reihenfolge: Teil 1, Teil 2, Teil 1 + 2, WiSo (Prüfungsteil laut Katalog)
  const TEILE: [string, string][] = [["Teil 1", "Teil 1"], ["Teil 2", "Teil 2"], ["Teil 1 + 2", "Teil 1 + 2"], ["WiSo", "SoWi"]];
  return (
    <div className="tp-pick">
      <section className="card tp-hero">
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <img className="vx-mark" src="/icons/vortex.svg" alt="" />
          <div style={{ flex: 1, minWidth: 220 }}><h2 style={{ margin: 0 }}>{pro && inApp ? "Tutor Pro" : "Tutor"}</h2><p className="small muted" style={{ margin: "4px 0 0" }}>{inApp
            ? <>Wähle ein Thema – der Chat öffnet sich. Sobald du deine erste Nachricht schreibst, löchert dich der Tutor eine ganze Sitzung lang mit Aufgaben im IHK-Stil und bewertet wie ein Prüfer mit Teilpunkten.{pro ? "" : " Kostenlos, mit einem einfacheren Modell als Tutor Pro."} Prüfung am {examLabel}.</>
            : <>Dein Prüfungstutor für die TAP2 – mit deiner eigenen KI, kostenlos. Wähle ein Thema: Der Tutor stellt dir eine ganze Sitzung lang Aufgaben im IHK-Stil, bewertet wie ein Prüfer mit Teilpunkten, und dein Graph lernt mit. Prüfung am {examLabel}.</>}</p></div>
          {pro && inApp && <div className="segs" role="group" aria-label="Modell">{(["sonnet", "haiku"] as const).map((m) => <button key={m} type="button" className={`seg ${model === m ? "on" : ""}`} aria-pressed={model === m} onClick={() => setModel(m)}>{m === "sonnet" ? "Gründlich (Sonnet)" : "Schnell (Haiku)"}</button>)}</div>}
        </div>
        {rec && (
          <div className="tp-rec">
            <div><span className="eyebrow">Empfehlung aus deinem Lehrplan</span><b>{rec.name}</b><p className="tiny muted" style={{ margin: "2px 0 0" }}>{rec.grund}{rec.fokus.length ? ` · Fokus: ${rec.fokus.map((f) => f.label).join(", ")}` : ""}</p></div>
            <button type="button" className="btn primary" disabled={busy} onClick={() => open(rec.topic, rec.fokus.map((f) => f.id))}><Ic name="play" cls="ic xs" /> Öffnen</button>
          </div>
        )}
        {err && <p className="small warn-text" role="alert" style={{ margin: "10px 0 0" }}>{err}</p>}
        <p className="tiny muted" style={{ margin: "10px 0 0" }}>Tutor-XP heute: {xpHeute} · jede bewertete Aufgabe zählt wie eine Antwort: XP mit Combo, Serie und Tagesziele (richtig ab der Hälfte der Punkte).</p>
        <div className="row tp-way">
          {signedIn ? <>
            <span className="small muted">So möchtest du lernen:</span>
            <div className="segs" role="radiogroup" aria-label="Weg">
              <button type="button" role="radio" aria-checked={inApp} className={`seg ${inApp ? "on" : ""}`} onClick={() => setWay("app")}>{pro ? "In der App (Pro)" : "In der App (kostenlos)"}</button>
              <button type="button" role="radio" aria-checked={!inApp} className={`seg ${!inApp ? "on" : ""}`} onClick={() => setWay("bruecke")}>Mit eigener KI</button>
            </div>
          </> : <>
            <span className="small muted">Mit Anmeldung bekommst du den kostenlosen KI-Tutor direkt in der App – ohne Kopieren.</span>
            <button type="button" className="btn small" onClick={() => void signIn()}><Ic name="users" cls="ic xs" /> Mit GitHub anmelden</button>
          </>}
        </div>
        {!pro && <p className="tiny muted vx-pro"><Ic name="lock" cls="ic xs" /> <b>Tutor Pro</b> mit stärkerer KI ist eine Premium-Funktion.</p>}
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
      <section className="card"><SyncNote /><ResetTutor /></section>
    </div>
  );
}

