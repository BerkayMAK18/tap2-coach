import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { Badge, Button, Card, CardEyebrow, ConfirmDialog, EmptyState, Icon, Input, Label, useToast } from "@/ui";
import { supabase } from "@/integrations/supabase/client";
import { graphQuery } from "@/lib/queries";
import { forceLayout } from "@/lib/graph-layout";
import { scaffoldGraph } from '@/lib/graph-scaffold';

export const Route = createFileRoute("/_authenticated/graph")({
  head: () => ({
    meta: [
      { title: "Wissensgraph — TAP2 Coach" },
      { name: "description", content: "Dein belegtes Verständnis und seine Zusammenhänge für die FIAE-Prüfung." },
      { property: "og:title", content: "Wissensgraph — TAP2 Coach" },
      { property: "og:description", content: "Dein belegtes Verständnis und seine Zusammenhänge für die FIAE-Prüfung." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(graphQuery()),
  component: GraphPage,
});

const TOPIC_FILLS = ["fill-brand", "fill-highlight", "fill-tone-violet-main", "fill-tone-yellow-main", "fill-tone-red-medium", "fill-tone-skyBlue-light", "fill-sand", "fill-tone-blue-medium"];

function GraphPage() {
  const { data: evidence } = useSuspenseQuery(graphQuery());
  const data = useMemo(() => scaffoldGraph(evidence.props, evidence.links), [evidence]);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [view, setView] = useState({ x: -500, y: -350, w: 1000, h: 700 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const drag = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const edges = useMemo(() => data.links.map((l) => ({ source: l.premise_id, target: l.conclusion_id })), [data.links]);
  const pos = useMemo(() => forceLayout(data.props.map((p) => p.id), edges), [data.props, edges]);
  const fitView = useMemo(() => {
    const pts = Object.values(pos);
    if (!pts.length) return { x: -500, y: -350, w: 1000, h: 700 };
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) - 120, maxX = Math.max(...xs) + 120, minY = Math.min(...ys) - 80, maxY = Math.max(...ys) + 80;
    let w = Math.max(400, maxX - minX), h = Math.max(280, maxY - minY);
    if (w / h > 1000 / 700) h = (w * 700) / 1000; else w = (h * 1000) / 700;
    return { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2, w, h };
  }, [pos]);
  useEffect(() => setView(fitView), [fitView]);
  const topics = useMemo(() => Array.from(new Set(data.props.map((p) => p.topic || "General"))), [data.props]);
  const fillFor = (t: string) => TOPIC_FILLS[topics.indexOf(t || "General") % TOPIC_FILLS.length];
  const byId = useMemo(() => new Map(data.props.map((p) => [p.id, p])), [data.props]);
  const q = query.trim().toLowerCase();
  const matchesText = (s: string) => !q || s.toLowerCase().includes(q);
  const visible = (p: { statement: string; topic: string | null }) => matchesText(p.statement) && (!topicFilter || (p.topic || "General") === topicFilter);
  const topicCount = (t: string) => data.props.filter((p) => (p.topic || "General") === t).length;
  const showLabels = data.props.length <= 30 || view.w < 900;

  const sel = selected ? byId.get(selected) : undefined;
  const premises = sel ? data.links.filter((l) => l.conclusion_id === sel.id).flatMap(l => { const p = byId.get(l.premise_id); return p ? [p] : []; }) : [];
  const conclusions = sel ? data.links.filter((l) => l.premise_id === sel.id).flatMap(l => { const p = byId.get(l.conclusion_id); return p ? [p] : []; }) : [];

  function onWheel(e: WheelEvent<SVGSVGElement>) {
    const k = e.deltaY > 0 ? 1.1 : 0.9;
    setView((v) => ({ x: v.x + (v.w * (1 - k)) / 2, y: v.y + (v.h * (1 - k)) / 2, w: v.w * k, h: v.h * k }));
  }
  function onDown(e: PointerEvent<SVGSVGElement>) {
    if ((e.target as Element).closest("[data-node]")) return;
    drag.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current || !svgRef.current) return;
    const scale = view.w / svgRef.current.clientWidth;
    const d = drag.current;
    setView((v) => ({ ...v, x: d.vx - (e.clientX - d.px) * scale, y: d.vy - (e.clientY - d.py) * scale }));
  }
  const zoom = (k: number) => setView((v) => ({ x: v.x + (v.w * (1 - k)) / 2, y: v.y + (v.h * (1 - k)) / 2, w: v.w * k, h: v.h * k }));

  async function remove() {
    if (!sel || sel.source_kind === 'category') return;
    const { error } = await supabase.from("propositions").delete().eq("id", sel.id);
    if (error) toast({ title: "Erkenntnis konnte nicht entfernt werden", variant: "error" });
    else {
      setSelected(null);
      await qc.invalidateQueries({ queryKey: ["graph"] });
      toast({ title: "Erkenntnis aus deinem Wissensgraph entfernt", variant: "success" });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-6 py-8 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="font-text text-body-200 font-medium text-slate">Was du verstanden hast</p>
          <h1 className="font-head text-heading-300">Wissensgraph</h1>
          <p className="max-w-2xl font-text text-body-300 text-slate">
            {evidence.props.length} Erkenntnisse · 4 Oberkategorien · 19 Themen
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <Label htmlFor="search">Erkenntnis suchen</Label>
          <Input id="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Aussagen durchsuchen…" />
        </div>
      </header>

      {data.props.length === 0 ? (
        <EmptyState
          icon={<Icon name="chain-linked" size={24} />}
          title="Dein Wissensgraph ist leer"
          description="Hier sammeln sich Erkenntnisse, die du im Tutor-Gespräch nachweislich verstanden hast."
          action={<Button asChild variant="solid"><Link to="/dashboard">Zum Tutor</Link></Button>}
        />
      ) : (
        <div className="grid grid-cols-12 items-start gap-6">
          <div className="col-span-12 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-sm border-2 border-ink bg-white p-4">
            <span className="font-text text-body-200 font-bold">Legende</span>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Nach Thema filtern">
              <Button variant={topicFilter ? "ghost" : "ink"} size="sm" aria-pressed={!topicFilter} onClick={() => setTopicFilter(null)}>Alle ({data.props.length})</Button>
              {topics.map((t) => (
                <Button key={t} variant={topicFilter === t ? "ink" : "ghost"} size="sm" aria-pressed={topicFilter === t} onClick={() => setTopicFilter(topicFilter === t ? null : t)}>
                  <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true"><circle cx="6" cy="6" r="5" className={`${fillFor(t)} stroke-ink`} strokeWidth={1} /></svg>
                  {t} ({topicCount(t)})
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 font-text text-body-200 text-slate">
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 40 12" className="h-3 w-10" aria-hidden="true"><line x1="2" y1="6" x2="32" y2="6" className="stroke-ink" strokeWidth={1.5} /><path d="M 30 1 L 38 6 L 30 11 z" className="fill-ink" /></svg>
                A → B: B baut auf A auf
              </span>
              <span>Leerer Kreis = Thema · gefüllter Punkt = Erkenntnis · graue Linie = Zuordnung</span>
              <span>Klick = Details · Ziehen = verschieben · Mausrad = Zoom</span>
            </div>
          </div>
          <div className="relative col-span-12 aspect-square rounded-sm border-2 border-ink bg-white lg:col-span-8">
            <div className="absolute right-3 top-3 z-10 flex gap-1">
              <Button variant="ghost" size="icon" aria-label="Vergrößern" onClick={() => zoom(0.8)}><Icon name="add" size={20} /></Button>
              <Button variant="ghost" size="icon" aria-label="Ansicht zurücksetzen" onClick={() => setView(fitView)}><Icon name="arrow-circular" size={20} /></Button>
            </div>
            <svg
              ref={svgRef}
              role="img"
              aria-label="Wissensgraph mit Zusammenhängen. Die Erkenntnisliste bietet dieselbe Auswahl per Tastatur."
              className="h-full w-full cursor-grab touch-none select-none"
              viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
              onWheel={onWheel}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={() => (drag.current = null)}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-ink" />
                </marker>
              </defs>
              {data.links.map((l) => {
                const a = pos[l.premise_id];
                const b = pos[l.conclusion_id];
                if (!a || !b) return null;
                const hot = selected && (l.premise_id === selected || l.conclusion_id === selected);
                return <line key={l.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={hot ? "stroke-ink" : "stroke-ink/20"} strokeWidth={hot ? 2 : 1.5} markerEnd={l.id.startsWith('structure:') ? undefined : 'url(#arrow)'} />;
              })}
              {data.props.map((p) => {
                const pt = pos[p.id];
                const isSel = p.id === selected;
                const near = !!selected && data.links.some((l) => (l.premise_id === selected && l.conclusion_id === p.id) || (l.conclusion_id === selected && l.premise_id === p.id));
                const dim = !visible(p) || (!!selected && !isSel && !near);
                return (
                  <g key={p.id} data-node transform={`translate(${pt.x},${pt.y})`} className={`cursor-pointer ${dim ? "opacity-20" : ""}`} onClick={() => setSelected(p.id)}>
                    <circle r={isSel ? 14 : 10} className={`${p.source_kind === 'category' ? 'fill-white' : fillFor(p.topic)} stroke-ink`} strokeWidth={isSel ? 3 : 1.5} />
                    {(selected ? isSel : showLabels || p.id.startsWith('category:')) && (
                      <text y={-18} textAnchor="middle" className="fill-ink font-text text-body-100">
                        {isSel ? (p.statement.length > 60 ? p.statement.slice(0, 58) + "…" : p.statement) : (p.statement.length > 28 ? p.statement.slice(0, 26) + "…" : p.statement)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="col-span-12 space-y-6 lg:col-span-4">
            {sel ? (
              <Card surface="white" size="sm" className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="brand">{sel.topic || "General"}</Badge>
                  <Button variant="ghost" size="icon" aria-label="Details schließen" onClick={() => setSelected(null)}><Icon name="close" size={20} /></Button>
                </div>
                <p className="font-head text-body-400">{sel.statement}</p>
                {premises.length > 0 && (
                  <div className="space-y-2">
                    <CardEyebrow>Baut auf</CardEyebrow>
                    <ul className="space-y-3">{premises.map((p) => <li key={p.id}><p className="text-body-200">{p.statement}</p><Button variant="ghost" onClick={() => setSelected(p.id)}>Erkenntnis öffnen</Button></li>)}</ul>
                  </div>
                )}
                {conclusions.length > 0 && (
                  <div className="space-y-2">
                    <CardEyebrow>Führt zu</CardEyebrow>
                    <ul className="space-y-3">{conclusions.map((p) => <li key={p.id}><p className="text-body-200">{p.statement}</p><Button variant="ghost" onClick={() => setSelected(p.id)}>Erkenntnis öffnen</Button></li>)}</ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {sel.source_kind === 'category' ? <><Badge variant="white">Thema · kein Verständnisnachweis</Badge><Button asChild size="sm"><Link to="/lernplan">Lernquellen ansehen</Link></Button><Button asChild size="sm"><Link to="/dashboard">Mit Tutor lernen</Link></Button></> : sel.source_session_id ? (
                    <Button asChild variant="ink" size="sm">
                      <Link to="/session/$sessionId" params={{ sessionId: sel.source_session_id }}>Zum ursprünglichen Gespräch</Link>
                    </Button>
                  ) : (
                    <Badge variant="white">Aus importierten Notizen</Badge>
                  )}
                  {sel.source_kind !== 'category' && <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>Entfernen</Button>}
                </div>
              </Card>
            ) : (
              <Card surface="brand" size="sm" className="space-y-2">
                <CardEyebrow>Zusammenhänge</CardEyebrow>
                <p className="font-text text-body-200">Wähle einen Punkt im Graphen oder eine Erkenntnis in der Liste – hier siehst du, worauf sie aufbaut und wohin sie führt.</p>
              </Card>
            )}
            <Card surface="white" size="sm" className="space-y-3">
              <CardEyebrow>Themen und Erkenntnisse</CardEyebrow>
              <ul className="max-h-96 space-y-1 overflow-y-auto">
                {data.props.filter(visible).map((p) => (
                  <li key={p.id}>
                    <Button variant="ghost" type="button" onClick={() => setSelected(p.id)} aria-pressed={p.id === selected}>
                      <svg viewBox="0 0 12 12" className="mt-1 h-3 w-3 shrink-0" aria-hidden="true"><circle cx="6" cy="6" r="5" className={`${fillFor(p.topic)} stroke-ink`} strokeWidth={1} /></svg>
                      <span className="whitespace-normal text-left">{p.statement}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Erkenntnis entfernen?"
        description="Diese Erkenntnis und ihre Verknüpfungen werden dauerhaft entfernt."
        confirmLabel="Entfernen"
        cancelLabel="Abbrechen"
        tone="danger"
        onConfirm={remove}
      />
    </div>
  );
}
