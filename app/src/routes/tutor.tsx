/**
 * Premium: Tutor mit Wissensgraph (Stufe 1, ohne KI). Für normale Nutzer unsichtbar (kein Menüeintrag).
 *
 * Freischaltung bis zum Login: /tutor?premium=1 setzt localStorage „tap2coach-premium“ auf diesem Gerät.
 * Das schützt nichts Geheimes – die Seite zeigt nur den eigenen, lokalen Lernstand. Die KI-Funktionen (Stufe 2)
 * werden serverseitig geprüft (app_metadata.role = 'admin'), siehe docs/TUTOR.md.
 */
import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { TAP2, TOPICS, allQ } from "@/content/catalog";
import { buildGraph, type GraphNode, type Level } from "@/lib/graph";
import { shuffle } from "@/lib/dates";
import { useProgress } from "@/store/progress";
import { TutorBridge } from "@/components/TutorBridge";
import { TutorChat } from "@/components/TutorChat";

const PREMIUM_KEY = "tap2coach-premium";
export const isPremium = () => { try { return localStorage.getItem(PREMIUM_KEY) === "1"; } catch { return false; } };

export const Route = createFileRoute("/tutor")({ validateSearch: z.object({ premium: z.coerce.string().optional().catch(undefined) }), component: Tutor });

// Einordnung → Chip der Live-App (ok/warn/bad) und Farbe im Graphen (Ampelfarben aus main.css)
const LV: Record<Level, { label: string; chip: string; fill: string }> = {
  stark: { label: "Stark", chip: "ok", fill: "var(--ok)" },
  festigen: { label: "Festigen", chip: "yellow", fill: "var(--yellow)" },
  schwach: { label: "Schwach", chip: "bad", fill: "var(--bad)" },
  offen: { label: "Offen", chip: "", fill: "var(--line-2)" },
};

function Tutor() {
  const { premium } = Route.useSearch();
  const [ok, setOk] = useState(isPremium());
  useEffect(() => { if (premium === "1") { try { localStorage.setItem(PREMIUM_KEY, "1"); } catch { /* privat */ } setOk(true); } }, [premium]);
  const { S, startSession } = useProgress();
  const navigate = useNavigate();
  if (!ok) return <section className="card"><h3>Diese Seite ist nicht verfügbar.</h3><p className="small muted"><Link to="/">Zur Übersicht</Link></p></section>;

  const g = buildGraph(S, TOPICS, TAP2.pakete, allQ(S));
  const train = (n: GraphNode) => { const qs = shuffle(allQ(S).filter((q) => q.topic === n.id)).slice(0, 20); startSession(`Tutor: ${n.label}`, qs.map((q) => q.id)); void navigate({ to: "/lernen/runde" }); };
  const List = ({ title, items, empty }: { title: string; items: GraphNode[]; empty: string }) => (
    <section className="card"><h3>{title}</h3>
      {items.length ? <ul className="tut-list">{items.slice(0, 6).map((n) => (
        <li key={n.id}><span className={`chip ${LV[n.level].chip}`}>{Math.round(n.pct * 100)} %</span><span className="tut-l">{n.label}{n.prio === "Muss" ? " · Muss" : ""}</span><button type="button" className="btn small ghost" onClick={() => train(n)}>Üben</button></li>))}</ul>
        : <p className="small muted">{empty}</p>}
    </section>
  );

  return (
    <>
      <div className="sec-head"><div><h2>Dein Wissensgraph</h2><p>Aus deinen Antworten: was du kannst, wo es hakt und was du noch nicht angefangen hast.</p></div></div>
      <section className="card tut-graph"><GraphSvg nodes={g.nodes} /></section>
      <div className="tut-cols">
        <List title="Schwächen – zuerst üben" items={g.weaknesses} empty="Keine Schwächen erkannt." />
        <List title="Stärken" items={g.strengths} empty="Noch keine Stärken – weiter so!" />
        <List title="Noch offen" items={g.gaps} empty="Alles begonnen." />
      </div>
      <section className="card"><h3>Fehlerschwerpunkte</h3>
        {g.errors.length ? <ol className="tut-errs">{g.errors.map((e) => <li key={e.id}><span>{e.q}</span><span className="tiny muted">{e.wrong}× falsch von {e.tries} Versuchen</span></li>)}</ol>
          : <p className="small muted">Noch keine wiederholten Fehler.</p>}
        {g.errors.length > 0 && <div className="row" style={{ marginTop: 10 }}><button type="button" className="btn small primary" onClick={() => { startSession("Tutor: Fehlerschwerpunkte", g.errors.map((e) => e.id)); void navigate({ to: "/lernen/runde" }); }}>Diese Fragen jetzt üben</button></div>}
      </section>
      <TutorChat g={g} />
      <section className="card"><details className="tx-paste"><summary className="small">Alternative ohne API: über ein Claude-Projekt (Kopieren)</summary><TutorBridge g={g} /></details></section>
    </>
  );
}

/** Einfache Graph-Darstellung: Prüfungsteile als Spalten, Themen als Kreise (Farbe = Einordnung, Größe = Fragenzahl). */
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
