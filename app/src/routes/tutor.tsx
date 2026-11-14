/**
 * Tutor (Premium, vorerst nur Admin): links der Chat über die ganze Fläche, rechts eine Leiste mit
 * - „Lehrplan“: Ziel, Fortschritt und Schritte des Tutors (Thema, Lernpakete, Beleg);
 * - „Lernstand“: Wissensgraph nach Prüfungsteil → Thema – Reife aus den Lernrunden, Reife aus den Tutor-Antworten
 *   und die Einschätzung des Tutors; dazu Erkenntnisse, Fehlvorstellungen, Fehlerschwerpunkte, Brücke ohne API;
 * - „Frage“: was der Tutor gerade fragt (zum Nachlesen beim Antworten).
 * Auf dem Handy wechseln Chat, Lehrplan, Lernstand und Frage über Reiter.
 *
 * Der Wissensgraph ist die Grundlage: Er geht als Übergabe an den Tutor (Lernstand je Thema, Fehler, Lernpfad),
 * und jede bewertete Antwort fließt als Beleg zurück (Tutor-Reife je Thema, XP, Tagesstatistik).
 *
 * Menüpunkt nur für Admin (Admin-Konto oder /tutor?premium=1 auf diesem Gerät). Das schützt nichts Geheimes –
 * die Seite zeigt nur den eigenen, lokalen Lernstand; die KI prüft der Server (app_metadata.role = 'admin').
 */
import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { TAP2, TOPICS, TP, allQ } from "@/content/catalog";
import { EXAM_DAY } from "@/config";
import { buildGraph, type GraphNode, type KnowledgeGraph, type Level } from "@/lib/graph";
import { daysBetween, shuffle, today } from "@/lib/dates";
import { handoff, phaseOf, tutorPct, type Pfad } from "@/lib/tutor-protocol";
import { useProgress } from "@/store/progress";
import { KB, PREMIUM_KEY, isPremium, useTutor, type SideTab } from "@/store/tutor";
import { Ic } from "@/ui-main";
import { TutorBridge, loadTutorStore } from "@/components/TutorBridge";
import { TutorChat } from "@/components/TutorChat";
import { SafeMarkdown } from "@/components/SafeMarkdown";

export const Route = createFileRoute("/tutor")({ validateSearch: z.object({ premium: z.coerce.string().optional().catch(undefined) }), component: Tutor });

// Einordnung → Chip der Live-App (ok/warn/bad) und Farbe im Graphen (Ampelfarben aus main.css)
const LV: Record<Level, { label: string; chip: string; fill: string }> = {
  stark: { label: "Stark", chip: "ok", fill: "var(--ok)" },
  festigen: { label: "Festigen", chip: "yellow", fill: "var(--yellow)" },
  schwach: { label: "Schwach", chip: "bad", fill: "var(--bad)" },
  offen: { label: "Offen", chip: "", fill: "var(--line-2)" },
};
const TABS: [SideTab, string][] = [["plan", "Lehrplan"], ["stand", "Lernstand"], ["frage", "Frage"]];
type MobileTab = "chat" | SideTab;

/** Übergabe an den Tutor aus dem Wissensgraphen und dem Lernpfad */
function makeHandoff(g: KnowledgeGraph, pfad: Pfad) {
  return handoff({
    examDays: Math.max(0, daysBetween(today(), EXAM_DAY)),
    topics: g.nodes.filter((n) => n.kind === "topic").map((n) => ({ id: n.id, name: n.label, muss: n.prio === "Muss", pct: n.pct, level: n.level, rot: n.red, neu: n.fresh, tutor: tutorPct(pfad, n.id) })),
    errors: g.errors.map((e) => ({ topic: e.topic, q: e.q, wrong: e.wrong })),
    pfad,
  });
}

function Tutor() {
  const { premium } = Route.useSearch();
  const [ok, setOk] = useState(isPremium());
  useEffect(() => { if (premium === "1") { try { localStorage.setItem(PREMIUM_KEY, "1"); } catch { /* privat */ } setOk(true); } }, [premium]);
  const S = useProgress((s) => s.S), { tab, setTab, pfad, convo } = useTutor();
  const [mtab, setMtab] = useState<MobileTab>("chat");
  if (!ok) return <section className="card"><h3>Diese Seite ist nicht verfügbar.</h3><p className="small muted"><Link to="/">Zur Übersicht</Link></p></section>;

  const g = buildGraph(S, TOPICS, TAP2.pakete, allQ(S));
  const side = (t: SideTab) => { setTab(t); setMtab(t); };
  const done = pfad.plan.filter((s) => s.status === "fertig").length;
  const badge = (k: MobileTab) => (k === "frage" && convo.pending ? <i className="tutor-dot" aria-label="offen" /> : k === "plan" && pfad.plan.length ? <span className="tc-count">{done}/{pfad.plan.length}</span> : null);

  return (
    <div className={`tutor-shell m-${mtab}`}>
      <div className="segs tutor-mtabs" role="tablist" aria-label="Tutor">
        {([["chat", "Chat"], ...TABS] as [MobileTab, string][]).map(([k, l]) => <button key={k} type="button" role="tab" className={`seg ${mtab === k ? "on" : ""}`} aria-selected={mtab === k} onClick={() => (k === "chat" ? setMtab("chat") : side(k))}>{l}{badge(k)}</button>)}
      </div>
      <section className="card tutor-main"><TutorChat handoff={() => makeHandoff(g, useTutor.getState().pfad)} onPlan={() => side("plan")} /></section>
      <aside className="card tutor-side" aria-label="Lehrplan, Lernstand und Frage">
        <div className="segs tutor-tabs" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" className={`seg ${tab === k ? "on" : ""}`} aria-selected={tab === k} onClick={() => side(k)}>{l}{badge(k)}</button>)}
        </div>
        <div className="tutor-side-b">{tab === "plan" ? <Lehrplan /> : tab === "frage" ? <Frage onChat={() => setMtab("chat")} /> : <Lernstand g={g} />}</div>
      </aside>
    </div>
  );
}

/** Lehrplan des Tutors */
function Lehrplan() {
  const { pfad, reset } = useTutor(), phase = phaseOf(pfad);
  if (!pfad.plan.length) return (
    <div className="tc-side-empty">
      <Ic name="map" cls="ic" />
      <p className="small muted">{phase === "plan" ? "Die Diagnose ist fertig – der Tutor erstellt jetzt deinen Lehrplan." : "Noch kein Lehrplan. Der Tutor findet zuerst mit ein paar Fragen heraus, wo du stehst, und baut dann den kürzesten Weg zur Prüfungsreife."}</p>
      {Object.keys(pfad.stand).length > 0 && <p className="tiny muted">Bisher eingeschätzt: {Object.keys(pfad.stand).length} Themen.</p>}
    </div>
  );
  const done = pfad.plan.filter((s) => s.status === "fertig").length;
  return (
    <>
      <p className="small" style={{ marginTop: 0 }}><b>Ziel:</b> {pfad.ziel}</p>
      <div className="row"><span className="small muted">{done} von {pfad.plan.length} Schritten</span><span className="spacer" /><b className="small">{Math.round((done / pfad.plan.length) * 100)} %</b></div>
      <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${(done / pfad.plan.length) * 100}%`, background: "var(--ok)" }} /></div>
      <ol className="tc-plan-list">
        {pfad.plan.map((s) => {
          const tp = tutorPct({ ...pfad, evidence: pfad.evidence.filter((e) => e.schritt === s.id) }, s.thema);
          return (
            <li key={s.id} className={s.status}>
              <span className="tc-dot" aria-hidden="true">{s.status === "fertig" ? <Ic name="check" cls="ic xs" /> : null}</span>
              <div>
                <div className="row" style={{ gap: 6 }}><b className="small">{s.titel}</b>{s.status === "aktiv" && <span className="chip blue">jetzt</span>}</div>
                <p className="tiny muted" style={{ margin: "2px 0 0" }}>{TP[s.thema]?.n ?? s.thema} · {s.pakete.map((p) => KB.pakete.get(p)?.titel ?? p).join(", ")}</p>
                <p className="tiny" style={{ margin: "4px 0 0" }}>{s.status === "fertig" && s.beleg ? <>✓ {s.beleg}</> : s.ziel}</p>
                {tp != null && s.status !== "offen" && <div className="bar tc-mini"><i style={{ width: `${Math.round(tp * 100)}%` }} /></div>}
              </div>
            </li>
          );
        })}
      </ol>
      <details className="tx-paste"><summary className="small">Lernpfad zurücksetzen</summary>
        <p className="tiny muted">Löscht Lehrplan, Einschätzung und Belege des Tutors auf diesem Gerät. XP und dein Lernstand bleiben.</p>
        <button type="button" className="btn small danger" onClick={() => { if (confirm("Lernpfad des Tutors wirklich löschen?")) reset(true); }}>Zurücksetzen</button>
      </details>
    </>
  );
}

/** Was der Tutor gerade fragt */
function Frage({ onChat }: { onChat: () => void }) {
  const q = useTutor((s) => s.convo.pending);
  if (!q) return <p className="small muted">Gerade keine offene Frage. Stellt der Tutor eine, steht sie hier zum Nachlesen – beantwortet wird sie in der Karte im Chat.</p>;
  return (
    <div className="tutor-task">
      <div className="row" style={{ gap: 6 }}>
        <span className="chip">{TP[q.thema]?.n ?? q.thema}</span>
        {q.operator && <span className="chip violet">{q.operator}</span>}
        {q.punkte != null && <span className="chip blue">{q.punkte} P</span>}
      </div>
      {q.kontext && <div className="tc-ctx small" style={{ marginTop: 10 }}><SafeMarkdown text={q.kontext} /></div>}
      <div className="qtext" style={{ marginTop: 10 }}><SafeMarkdown text={q.frage} /></div>
      {q.optionen && <ol className="small tc-optlist" type="A">{q.optionen.map((o, i) => <li key={i}>{o}</li>)}</ol>}
      <div className="row tutor-mob-only" style={{ marginTop: 12 }}><button type="button" className="btn small primary" onClick={onChat}><Ic name="pencil" cls="ic xs" /> Zur Antwort</button></div>
    </div>
  );
}

/** Lernstand nach Prüfungsteil → Thema: Reife aus den Lernrunden (Balken), aus den Tutor-Antworten (dünner Balken) und Einschätzung des Tutors */
function Lernstand({ g }: { g: KnowledgeGraph }) {
  const { S, startSession } = useProgress(), pfad = useTutor((s) => s.pfad), navigate = useNavigate();
  const bridge = loadTutorStore();
  const insights = [...bridge.insights.map((i) => ({ thema: i.thema, aussage: i.aussage })), ...pfad.insights], miscon = [...bridge.miscon, ...pfad.miscon];
  const train = (n: GraphNode) => { const qs = shuffle(allQ(S).filter((q) => q.topic === n.id)).slice(0, 20); startSession(`Tutor: ${n.label}`, qs.map((q) => q.id)); void navigate({ to: "/lernen/runde" }); };
  const teile = g.nodes.filter((n) => n.kind === "teil");
  return (
    <>
      <div className="tc-legend tiny muted"><span><i className="b1" /> Lernrunden</span><span><i className="b2" /> Tutor-Antworten</span><span className="chip">KI</span> Einschätzung</div>
      {teile.map((t) => (
        <div key={t.id} className="tutor-teil">
          <div className="row"><b>{t.label}</b><span className="spacer" /><span className={`chip ${LV[t.level].chip}`}>{Math.round(t.pct * 100)} %</span></div>
          <ul className="tutor-topics">
            {g.nodes.filter((n) => n.kind === "topic" && n.parent === t.id).map((n) => {
              const k = pfad.stand[n.id], tp = tutorPct(pfad, n.id);
              return (
                <li key={n.id}>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="tut-l small">{n.label}{n.prio === "Muss" ? " · Muss" : ""}</span>
                    {k && <span className={`chip ${LV[k.stufe].chip}`} title={k.notiz ?? ""}>KI: {LV[k.stufe].label}</span>}
                    <button type="button" className="btn small ghost" onClick={() => train(n)} aria-label={`${n.label} üben`}>Üben</button>
                  </div>
                  <div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${Math.round(n.pct * 100)}%`, background: LV[n.level].fill }} /></div>
                  {tp != null && <div className="bar violet tc-mini" title={`Tutor: ${Math.round(tp * 100)} %`}><i style={{ width: `${Math.round(tp * 100)}%` }} /></div>}
                  {k?.notiz && <p className="tiny muted" style={{ margin: "4px 0 0" }}>{k.notiz}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {(insights.length > 0 || miscon.length > 0) && (
        <div className="tutor-teil">
          <b>Vom Tutor festgehalten</b>
          {insights.length > 0 && <ul className="small tutor-notes">{insights.slice(-6).reverse().map((i, n) => <li key={"i" + n}><b>{TP[i.thema]?.n ?? i.thema}:</b> {i.aussage}</li>)}</ul>}
          {miscon.length > 0 && <ul className="small tutor-notes bad">{miscon.slice(-4).reverse().map((i, n) => <li key={"m" + n}><b>{TP[i.thema]?.n ?? i.thema}:</b> {i.aussage}</li>)}</ul>}
        </div>
      )}
      {g.errors.length > 0 && (
        <div className="tutor-teil">
          <div className="row"><b>Fehlerschwerpunkte</b><span className="spacer" /><button type="button" className="btn small primary" onClick={() => { startSession("Tutor: Fehlerschwerpunkte", g.errors.map((e) => e.id)); void navigate({ to: "/lernen/runde" }); }}>Üben</button></div>
          <ol className="tut-errs small">{g.errors.slice(0, 5).map((e) => <li key={e.id}><span>{e.q.length > 120 ? e.q.slice(0, 119) + "…" : e.q}</span><span className="tiny muted">{e.wrong}× falsch</span></li>)}</ol>
        </div>
      )}
      <details className="tx-paste"><summary className="small">Wissensgraph groß</summary><div className="tut-graph"><GraphSvg nodes={g.nodes} /></div></details>
      <details className="tx-paste"><summary className="small">Alternative ohne API: über ein Claude-Projekt (Kopieren)</summary><TutorBridge g={g} /></details>
    </>
  );
}

/** Graph-Darstellung: Prüfungsteile als Spalten, Themen als Kreise (Farbe = Einordnung, Größe = Fragenzahl). */
function GraphSvg({ nodes }: { nodes: GraphNode[] }) {
  const teile = nodes.filter((n) => n.kind === "teil"), W = 900, colW = W / teile.length;
  const topicsOf = (t: string) => nodes.filter((n) => n.kind === "topic" && n.parent === t);
  const H = 90 + Math.max(...teile.map((t) => topicsOf(t.id).length)) * 52;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wissensgraph nach Prüfungsteil">
      {teile.map((t, i) => {
        const cx = colW * i + colW / 2, list = topicsOf(t.id);
        return (
          <g key={t.id}>
            <circle cx={cx} cy={36} r={24} fill={LV[t.level].fill} opacity={0.9} />
            <text x={cx} y={41} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">{Math.round(t.pct * 100)}%</text>
            <text x={cx} y={76} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ink)">{t.label}</text>
            {list.map((n, j) => { const y = 108 + j * 52, r = 7 + Math.min(10, n.total / 6); return (
              <g key={n.id}>
                <line x1={cx} y1={84} x2={cx - colW / 2 + 28} y2={y} stroke="var(--line-2)" />
                <circle cx={cx - colW / 2 + 28} cy={y} r={r} fill={LV[n.level].fill}><title>{`${n.label}: ${Math.round(n.pct * 100)} % · ${LV[n.level].label}`}</title></circle>
                <text x={cx - colW / 2 + 50} y={y + 4} fontSize={12} fill="var(--ink)">{n.label.length > 34 ? n.label.slice(0, 33) + "…" : n.label} · {Math.round(n.pct * 100)}%</text>
              </g>); })}
          </g>
        );
      })}
    </svg>
  );
}
