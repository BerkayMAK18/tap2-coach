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
import { Card, CardEyebrow } from "@/ui";
import { TAP2, TOPICS, allQ } from "@/content/catalog";
import { buildGraph, type GraphNode, type Level } from "@/lib/graph";
import { shuffle } from "@/lib/dates";
import { useProgress } from "@/store/progress";
import { TutorBridge } from "@/components/TutorBridge";

const PREMIUM_KEY = "tap2coach-premium";
export const isPremium = () => { try { return localStorage.getItem(PREMIUM_KEY) === "1"; } catch { return false; } };

export const Route = createFileRoute("/tutor")({ validateSearch: z.object({ premium: z.coerce.string().optional().catch(undefined) }), component: Tutor });

const LV: Record<Level, { label: string; cls: string; fill: string }> = {
  stark: { label: "Stark", cls: "bg-tone-success-light", fill: "hsl(152 55% 42%)" },
  festigen: { label: "Festigen", cls: "bg-tone-yellow-light", fill: "hsl(45 100% 55%)" },
  schwach: { label: "Schwach", cls: "bg-tone-error-light", fill: "hsl(4 74% 52%)" },
  offen: { label: "Offen", cls: "bg-muted", fill: "hsl(220 10% 75%)" },
};

function Tutor() {
  const { premium } = Route.useSearch();
  const [ok, setOk] = useState(isPremium());
  useEffect(() => { if (premium === "1") { try { localStorage.setItem(PREMIUM_KEY, "1"); } catch { /* privat */ } setOk(true); } }, [premium]);
  const { S, startSession } = useProgress();
  const navigate = useNavigate();
  if (!ok) return <Card className="mx-auto max-w-xl"><p>Diese Seite ist nicht verfügbar.</p><Link to="/" className="underline">Zur Übersicht</Link></Card>;

  const g = buildGraph(S, TOPICS, TAP2.pakete, allQ(S));
  const train = (n: GraphNode) => { const qs = shuffle(allQ(S).filter((q) => q.topic === n.id)).slice(0, 20); startSession(`Tutor: ${n.label}`, qs.map((q) => q.id)); navigate({ to: "/lernen/runde" }); };
  const List = ({ title, items, empty }: { title: string; items: GraphNode[]; empty: string }) => (
    <Card className="space-y-3">
      <CardEyebrow>{title}</CardEyebrow>
      {items.length ? <ul className="space-y-2">{items.slice(0, 6).map((n) => (
        <li key={n.id} className="flex items-center gap-3">
          <span className={`rounded px-2 text-body-100 ${LV[n.level].cls}`}>{Math.round(n.pct * 100)} %</span>
          <span className="flex-1">{n.label}{n.prio === "Muss" ? " · Muss" : ""}</span>
          <button className="text-body-200 underline" onClick={() => train(n)}>Üben</button>
        </li>))}</ul> : <p className="text-body-200 text-slate">{empty}</p>}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-heading-300">Dein Wissensgraph</h1><p className="text-body-300 text-slate">Aus deinen Antworten: was du kannst, wo es hakt und was du noch nicht angefangen hast.</p></div>
      <Card className="overflow-x-auto"><GraphSvg nodes={g.nodes} /></Card>
      <div className="grid gap-4 md:grid-cols-3">
        <List title="Schwächen – zuerst üben" items={g.weaknesses} empty="Keine Schwächen erkannt." />
        <List title="Stärken" items={g.strengths} empty="Noch keine Stärken – weiter so!" />
        <List title="Noch offen" items={g.gaps} empty="Alles begonnen." />
      </div>
      <Card className="space-y-3">
        <CardEyebrow>Fehlerschwerpunkte</CardEyebrow>
        {g.errors.length ? <ol className="list-decimal space-y-2 pl-5">{g.errors.map((e) => <li key={e.id}><span className="line-clamp-2">{e.q}</span><span className="text-body-100 text-slate">{e.wrong}× falsch von {e.tries} Versuchen</span></li>)}</ol>
          : <p className="text-body-200 text-slate">Noch keine wiederholten Fehler.</p>}
        {g.errors.length > 0 && <button className="text-body-200 underline" onClick={() => { startSession("Tutor: Fehlerschwerpunkte", g.errors.map((e) => e.id)); navigate({ to: "/lernen/runde" }); }}>Diese Fragen jetzt üben</button>}
      </Card>
      <TutorBridge g={g} />
    </div>
  );
}

/** Einfache Graph-Darstellung: Prüfungsteile als Spalten, Themen als Kreise (Farbe = Einordnung, Größe = Fragenzahl). */
function GraphSvg({ nodes }: { nodes: GraphNode[] }) {
  const teile = nodes.filter((n) => n.kind === "teil"), W = 900, colW = W / teile.length;
  const topicsOf = (t: string) => nodes.filter((n) => n.kind === "topic" && n.parent === t);
  const H = 90 + Math.max(...teile.map((t) => topicsOf(t.id).length)) * 52;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full" role="img" aria-label="Wissensgraph nach Prüfungsteil">
      {teile.map((t, i) => {
        const cx = colW * i + colW / 2, list = topicsOf(t.id);
        return (
          <g key={t.id}>
            <circle cx={cx} cy={36} r={24} fill={LV[t.level].fill} opacity={0.9} />
            <text x={cx} y={41} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">{Math.round(t.pct * 100)}%</text>
            <text x={cx} y={76} textAnchor="middle" fontSize={13} fontWeight={700}>{t.label}</text>
            {list.map((n, j) => { const y = 108 + j * 52, r = 7 + Math.min(10, n.total / 6); return (
              <g key={n.id}>
                <line x1={cx} y1={84} x2={cx - colW / 2 + 28} y2={y} stroke="hsl(220 14% 87%)" />
                <circle cx={cx - colW / 2 + 28} cy={y} r={r} fill={LV[n.level].fill}><title>{`${n.label}: ${Math.round(n.pct * 100)} % · ${LV[n.level].label}`}</title></circle>
                <text x={cx - colW / 2 + 50} y={y + 4} fontSize={12}>{n.label.length > 34 ? n.label.slice(0, 33) + "…" : n.label} · {Math.round(n.pct * 100)}%</text>
              </g>); })}
          </g>
        );
      })}
    </svg>
  );
}
