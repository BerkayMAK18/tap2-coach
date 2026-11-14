/**
 * Tutor (Premium, vorerst nur Admin): links der KI-Chat über die ganze Fläche, rechts eine eigene Leiste mit
 * - „Lernstand“: Lehrplan nach Prüfungsteil → Thema mit Reife aus dem Lernstand (Wissensgraph) und der Einschätzung
 *   des Tutors je Thema, belegte Erkenntnisse, Fehlerschwerpunkte, großer Graph und die Brücke ohne API;
 * - „Aufgabe“: was der Tutor gerade fragt (Operator, Punkte, Aufgabentext, Hinweis).
 * Auf dem Handy wechseln Chat, Lernstand und Aufgabe über Reiter.
 *
 * Menüpunkt nur für Admin (Admin-Konto oder /tutor?premium=1 auf diesem Gerät). Das schützt nichts Geheimes –
 * die Seite zeigt nur den eigenen, lokalen Lernstand; die KI prüft der Server (app_metadata.role = 'admin').
 */
import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { TAP2, TOPICS, TP, allQ } from "@/content/catalog";
import { buildGraph, type GraphNode, type KnowledgeGraph, type Level } from "@/lib/graph";
import { shuffle } from "@/lib/dates";
import { useProgress } from "@/store/progress";
import { PREMIUM_KEY, isPremium, useTutor, type SideTab } from "@/store/tutor";
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
type MobileTab = "chat" | SideTab;

function Tutor() {
  const { premium } = Route.useSearch();
  const [ok, setOk] = useState(isPremium());
  useEffect(() => { if (premium === "1") { try { localStorage.setItem(PREMIUM_KEY, "1"); } catch { /* privat */ } setOk(true); } }, [premium]);
  const S = useProgress((s) => s.S), { tab, setTab, task } = useTutor();
  const [mtab, setMtab] = useState<MobileTab>("chat");
  const input = useRef<HTMLTextAreaElement>(null);
  // Neue Aufgabe vom Tutor: auf dem Handy bleibt der Chat, ein Punkt am Reiter zeigt sie an
  const [seen, setSeen] = useState(task?.titel ?? "");
  if (!ok) return <section className="card"><h3>Diese Seite ist nicht verfügbar.</h3><p className="small muted"><Link to="/">Zur Übersicht</Link></p></section>;

  const g = buildGraph(S, TOPICS, TAP2.pakete, allQ(S));
  const side = (t: SideTab) => { setTab(t); setMtab(t); if (t === "aufgabe") setSeen(task?.titel ?? ""); };
  const answer = () => { setMtab("chat"); requestAnimationFrame(() => input.current?.focus()); };
  const newTask = !!task && task.titel !== seen;

  return (
    <div className={`tutor-shell m-${mtab}`}>
      <div className="segs tutor-mtabs" role="tablist" aria-label="Tutor">
        {([["chat", "Chat"], ["lernstand", "Lernstand"], ["aufgabe", "Aufgabe"]] as const).map(([k, l]) => <button key={k} type="button" role="tab" className={`seg ${mtab === k ? "on" : ""}`} aria-selected={mtab === k} onClick={() => (k === "chat" ? setMtab("chat") : side(k))}>{l}{k === "aufgabe" && newTask && <i className="tutor-dot" aria-label="neu" />}</button>)}
      </div>
      <section className="card tutor-main"><TutorChat g={g} inputRef={input} /></section>
      <aside className="card tutor-side" aria-label="Lernstand und Aufgabe">
        <div className="segs tutor-tabs" role="tablist">
          {([["lernstand", "Lernstand"], ["aufgabe", "Aufgabe"]] as const).map(([k, l]) => <button key={k} type="button" role="tab" className={`seg ${tab === k ? "on" : ""}`} aria-selected={tab === k} onClick={() => side(k)}>{l}{k === "aufgabe" && newTask && tab !== "aufgabe" && <i className="tutor-dot" aria-label="neu" />}</button>)}
        </div>
        <div className="tutor-side-b">{tab === "aufgabe" ? <Aufgabe onAnswer={answer} /> : <Lernstand g={g} />}</div>
      </aside>
    </div>
  );
}

/** Was der Tutor gerade fragt */
function Aufgabe({ onAnswer }: { onAnswer: () => void }) {
  const task = useTutor((s) => s.task);
  if (!task) return <p className="small muted">Noch keine Aufgabe. Starte links eine Sitzung – Fragen und Aufgaben des Tutors erscheinen hier, damit du sie beim Antworten im Blick hast.</p>;
  return (
    <div className="tutor-task">
      <div className="row" style={{ gap: 6 }}>
        {task.thema && <span className="chip">{TP[task.thema]?.n ?? task.thema}</span>}
        {task.operator && <span className="chip violet">{task.operator}</span>}
        {task.punkte != null && <span className="chip blue">{task.punkte} P</span>}
      </div>
      <h3 style={{ marginTop: 10 }}>{task.titel}</h3>
      <div className="qtext" style={{ marginTop: 8 }}><SafeMarkdown text={task.text} /></div>
      {task.hinweis && <details className="tx-paste"><summary className="small">Hinweis anzeigen</summary><p className="small">{task.hinweis}</p></details>}
      <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn small primary" onClick={onAnswer}><Ic name="pencil" cls="ic xs" /> Antwort schreiben</button></div>
    </div>
  );
}

/** Lernstand nach Lehrplan: Prüfungsteil → Thema, Reife aus dem Lernstand und Einschätzung des Tutors */
function Lernstand({ g }: { g: KnowledgeGraph }) {
  const { S, startSession } = useProgress(), stand = useTutor((s) => s.stand), navigate = useNavigate();
  const { insights, miscon } = loadTutorStore();
  const train = (n: GraphNode) => { const qs = shuffle(allQ(S).filter((q) => q.topic === n.id)).slice(0, 20); startSession(`Tutor: ${n.label}`, qs.map((q) => q.id)); void navigate({ to: "/lernen/runde" }); };
  const teile = g.nodes.filter((n) => n.kind === "teil");
  return (
    <>
      <p className="tiny muted">Balken: Reife aus deinen Antworten. Chip „KI“: Einschätzung des Tutors aus dem Gespräch.</p>
      {teile.map((t) => (
        <div key={t.id} className="tutor-teil">
          <div className="row"><b>{t.label}</b><span className="spacer" /><span className={`chip ${LV[t.level].chip}`}>{Math.round(t.pct * 100)} %</span></div>
          <ul className="tutor-topics">
            {g.nodes.filter((n) => n.kind === "topic" && n.parent === t.id).map((n) => {
              const k = stand[n.id];
              return (
                <li key={n.id}>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="tut-l small">{n.label}{n.prio === "Muss" ? " · Muss" : ""}</span>
                    {k && <span className={`chip ${LV[k.stufe].chip}`} title={k.notiz ?? ""}>KI: {LV[k.stufe].label}</span>}
                    <button type="button" className="btn small ghost" onClick={() => train(n)} aria-label={`${n.label} üben`}>Üben</button>
                  </div>
                  <div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${Math.round(n.pct * 100)}%`, background: LV[n.level].fill }} /></div>
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
