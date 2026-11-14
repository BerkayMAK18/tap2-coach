/**
 * Reiter „Dein Stand“: Konzept-Graph des Themas als Netz – Thema in der Mitte, Lernpakete auf dem inneren Ring, Konzepte
 * (Kernaussagen) außen, Fehlvorstellungen als rote Rauten an ihrem Konzept. Farbe = Einordnung, Kreisgröße = Anzahl
 * Tutor-Belege, leerer Kreis = noch offen. Darunter die Konzepte als Liste mit Prozent, Abgleich und Zurücksetzen.
 */
import type { ConceptGraph } from "@/lib/graph";
import { useTutor } from "@/store/tutor";
import { Ic } from "@/ui-main";
import { ask } from "@/ui-main/ask";
import { LV, pc, tn } from "./shared";

const W = 340, ROW = 30;
const NW = 440, C = NW / 2, R_P = 54, R_K = 112, R_F = 84;
const cutL = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Netz-Graph: Thema → Lernpakete → Konzepte, Fehlvorstellungen als eigene Knoten */
export function NetGraph({ g }: { g: ConceptGraph }) {
  const n = Math.max(1, g.concepts.length), ang = (i: number) => -Math.PI / 2 + (2 * Math.PI * (i + 0.5)) / n;
  const at = (a: number, r: number) => [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
  const pakete = [...new Set(g.concepts.map((c) => c.paket))].map((pid) => {
    const idx = g.concepts.map((c, i) => (c.paket === pid ? i : -1)).filter((i) => i >= 0);
    return { pid, titel: g.concepts[idx[0]].paketTitel, a: (ang(idx[0]) + ang(idx[idx.length - 1])) / 2, idx };
  });
  const idxOf = new Map(g.concepts.map((c, i) => [c.id, i]));
  const fvs = g.miscon.map((m, j) => { const i = m.konzept != null ? idxOf.get(m.konzept) : undefined; const a = i != null ? ang(i) + (j % 2 ? 0.06 : -0.06) : -Math.PI / 2 + j * 0.3; return { m, a, i }; });
  const [tx, ty] = [C, C];
  return (
    <svg viewBox={`0 0 ${NW} ${NW}`} className="tp-net" role="img" aria-label={`Wissensgraph ${tn(g.topic)}: ${g.concepts.length} Konzepte, ${g.miscon.filter((m) => m.active).length} offene Fehlvorstellungen`}>
      {pakete.map((p) => { const [px, py] = at(p.a, R_P); return (
        <g key={p.pid}>
          <line x1={tx} y1={ty} x2={px} y2={py} stroke="var(--line-2)" strokeWidth={2} />
          {p.idx.map((i) => { const [kx, ky] = at(ang(i), R_K); return <line key={i} x1={px} y1={py} x2={kx} y2={ky} stroke="var(--line-2)" />; })}
        </g>
      ); })}
      {fvs.map(({ m, a, i }) => { const [fx, fy] = at(a, R_F); const k = i != null ? at(ang(i), R_K) : null; return (
        <g key={m.id} opacity={m.active ? 1 : 0.35}>
          {k && <line x1={fx} y1={fy} x2={k[0]} y2={k[1]} stroke="var(--bad)" strokeDasharray="3 3" />}
          <rect x={fx - 6} y={fy - 6} width={12} height={12} transform={`rotate(45 ${fx} ${fy})`} fill={m.active ? "var(--bad)" : "var(--line-2)"}><title>{`Fehlvorstellung${m.active ? "" : " (ausgeräumt)"}: ${m.text}${m.count > 1 ? ` (${m.count}×)` : ""}`}</title></rect>
        </g>
      ); })}
      {pakete.map((p) => { const [px, py] = at(p.a, R_P); return <circle key={p.pid} cx={px} cy={py} r={9} fill="var(--violet)"><title>{`Lernpaket ${p.titel}`}</title></circle>; })}
      {g.concepts.map((c, i) => {
        const a = ang(i), [kx, ky] = at(a, R_K), [lx, ly] = at(a, R_K + 13), cos = Math.cos(a), rad = 6 + Math.min(5, c.n * 1.2);
        const anchor = cos > 0.15 ? "start" : cos < -0.15 ? "end" : "middle", dy = Math.sin(a) > 0.85 ? 10 : Math.sin(a) < -0.85 ? -2 : 4;
        return (
          <g key={c.id}>
            <circle cx={kx} cy={ky} r={rad} fill={c.m == null ? "var(--surface)" : LV[c.level].fill} stroke={c.m == null ? "var(--line-2)" : "none"} strokeWidth={2}><title>{`${c.label}: ${pc(c.m)} · ${LV[c.level].label} · ${c.n} Tutor-Belege`}</title></circle>
            <text x={lx} y={ly + dy} fontSize={10.5} textAnchor={anchor} fill="var(--ink)">{cutL(c.label, 17)}</text>
          </g>
        );
      })}
      <circle cx={tx} cy={ty} r={24} fill={LV[g.level].fill} />
      <text x={tx} y={ty + 4} fontSize={12} fontWeight={800} textAnchor="middle" fill={g.m == null ? "var(--ink)" : "#fff"}>{pc(g.m)}</text>
    </svg>
  );
}
type Row = { kind: "paket"; label: string } | { kind: "konzept"; c: ConceptGraph["concepts"][number] } | { kind: "fv"; text: string; count: number; active: boolean };

export function GraphSvg({ g }: { g: ConceptGraph }) {
  const rows: Row[] = []; let lastP = "";
  g.concepts.forEach((c) => {
    if (c.paket !== lastP) { rows.push({ kind: "paket", label: c.paketTitel }); lastP = c.paket; }
    rows.push({ kind: "konzept", c });
    g.miscon.filter((m) => m.konzept === c.id).forEach((m) => rows.push({ kind: "fv", text: m.text, count: m.count, active: m.active }));
  });
  g.miscon.filter((m) => !m.konzept || !g.concepts.some((c) => c.id === m.konzept)).forEach((m) => rows.push({ kind: "fv", text: m.text, count: m.count, active: m.active }));
  const H = rows.length * ROW + 10, cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  let py = 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tp-graph" role="img" aria-label={`Wissensgraph ${tn(g.topic)}`}>
      {rows.map((r, i) => {
        const y = i * ROW + ROW / 2 + 5;
        if (r.kind === "paket") { py = y; return (
          <g key={i}><rect x={4} y={y - 11} width={W - 8} height={22} rx={11} fill="var(--surface-2)" /><text x={16} y={y + 4} fontSize={11.5} fontWeight={800} fill="var(--muted)">{cut(r.label, 46)}</text></g>
        ); }
        if (r.kind === "konzept") {
          const c = r.c, rad = 5 + Math.min(5, c.n * 1.2), line = <path d={`M18 ${py + 11} V${y} H${40 - rad}`} fill="none" stroke="var(--line-2)" />;
          return (
            <g key={i}>{line}
              <circle cx={40} cy={y} r={rad} fill={LV[c.level].fill} stroke={c.m == null ? "var(--line-2)" : "none"}><title>{`${c.label}: ${pc(c.m)} · ${LV[c.level].label} · ${c.n} Belege`}</title></circle>
              <text x={56} y={y + 4} fontSize={12} fill="var(--ink)">{cut(c.label, 30)}</text>
              <text x={W - 8} y={y + 4} fontSize={11.5} fontWeight={700} textAnchor="end" fill="var(--muted)">{pc(c.m)}</text>
            </g>
          );
        }
        return (
          <g key={i}>
            <path d={`M40 ${y - ROW + 8} V${y} H58`} fill="none" stroke="var(--bad)" strokeDasharray="3 3" opacity={r.active ? 1 : 0.4} />
            <rect x={60} y={y - 6} width={12} height={12} transform={`rotate(45 66 ${y})`} fill={r.active ? "var(--bad)" : "var(--line-2)"}><title>{r.text}</title></rect>
            <text x={80} y={y + 4} fontSize={11.5} fill={r.active ? "var(--ink)" : "var(--muted)"} textDecoration={r.active ? undefined : "line-through"}>{cut(r.text, 34)}{r.count > 1 ? ` (${r.count}×)` : ""}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function StandView({ g }: { g: ConceptGraph }) {
  const active = g.miscon.filter((m) => m.active);
  return (
    <>
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        <b>{tn(g.topic)}</b><span className="spacer" />
        <span className={`chip ${LV[g.level].chip}`}>{LV[g.level].label} · {pc(g.m)}</span>
      </div>
      <div className="tc-legend tiny muted" style={{ marginTop: 8 }}>
        {(["stark", "festigen", "schwach", "offen"] as const).map((l) => <span key={l}><i style={{ background: LV[l].fill, width: 10, height: 10, borderRadius: "50%" }} />{LV[l].label}</span>)}
        <span><i style={{ background: "var(--bad)", width: 9, height: 9, transform: "rotate(45deg)", borderRadius: 1 }} />Fehlvorstellung</span>
      </div>
      <div className="tp-graph-wrap"><NetGraph g={g} /></div>
      <details className="tx-paste"><summary className="small">Konzepte als Liste</summary><GraphSvg g={g} /></details>
      {active.length > 0 && (
        <div className="tutor-teil">
          <b className="small">Offene Fehlvorstellungen</b>
          <ul className="small tutor-notes bad">{active.map((m) => <li key={m.id}>{m.text}{m.count > 1 ? ` (${m.count}×)` : ""}</li>)}</ul>
        </div>
      )}
      <SyncNote />
      <ResetTutor />
    </>
  );
}

/** Abgleich des Tutor-Stands (alle Geräte) */
export function SyncNote() {
  const sync = useTutor((s) => s.sync);
  return (
    <div className="tutor-teil tp-sync small">
      {sync.off ? <p className="muted" style={{ margin: 0 }}><Ic name="cloud" cls="ic xs" /> {sync.off}</p>
        : sync.err ? <p className="warn-text" style={{ margin: 0 }}>{sync.err}</p>
        : <p className="muted" style={{ margin: 0 }}><Ic name="cloud" cls="ic xs" /> {sync.busy ? "Gleiche ab …" : sync.at ? "Im Konto gesichert – auf allen deinen Geräten gleich." : "Wird beim nächsten Abgleich im Konto gesichert."}</p>}
    </div>
  );
}

/** Tutor-Wissen zurücksetzen (alle Geräte) */
export function ResetTutor() {
  const reset = useTutor((s) => s.reset);
  return (
    <details className="tx-paste"><summary className="small">Tutor-Wissen zurücksetzen</summary>
      <p className="tiny muted">Löscht Belege, Fehlvorstellungen und Sitzungen des Tutors auf allen deinen Geräten – der Graph und der Lehrplan beginnen neu. XP und dein Lernstand aus den Lernrunden bleiben.</p>
      <button type="button" className="btn small danger" onClick={() => void ask({ title: "Tutor-Wissen zurücksetzen?", text: "Belege, Fehlvorstellungen und Sitzungen des Tutors werden auf allen deinen Geräten gelöscht. Graph und Lehrplan beginnen neu. XP und Lernrunden bleiben.", ok: "Zurücksetzen", danger: true }).then((y) => y && reset())}>Zurücksetzen</button>
    </details>
  );
}
