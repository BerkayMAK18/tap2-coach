/**
 * Reiter „Dein Stand“: Konzept-Graph des Themas – Lernpakete → Konzepte (Kernaussagen), Fehlvorstellungen als eigene
 * Knoten. Farbe = Einordnung, Kreisgröße = Anzahl Tutor-Belege, Balken = Beherrschung aus Tutor-Belegen + Lernrunden.
 * Darunter der Abgleich des Tutor-Stands zwischen Geräten.
 */
import type { ConceptGraph } from "@/lib/graph";
import { useTutor } from "@/store/tutor";
import { Ic } from "@/ui-main";
import { LV, pc, tn } from "./shared";

const W = 340, ROW = 30;
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
      <div className="tp-graph-wrap"><GraphSvg g={g} /></div>
      {active.length > 0 && (
        <div className="tutor-teil">
          <b className="small">Offene Fehlvorstellungen</b>
          <ul className="small tutor-notes bad">{active.map((m) => <li key={m.id}>{m.text}{m.count > 1 ? ` (${m.count}×)` : ""}</li>)}</ul>
        </div>
      )}
      <SyncNote />
    </>
  );
}

/** Abgleich des Tutor-Stands (alle Geräte) */
export function SyncNote() {
  const { sync, syncNow } = useTutor();
  return (
    <div className="tutor-teil tp-sync small">
      {sync.mismatch ? (
        <>
          <p className="warn-text" style={{ margin: 0 }}>In deinem Konto liegt ein Tutor-Stand mit einem anderen Sync-Schlüssel. Er wird nicht überschrieben.</p>
          <button type="button" className="btn small danger" style={{ marginTop: 6 }} onClick={() => { if (confirm("Tutor-Stand in der Cloud durch den Stand dieses Geräts ersetzen? Der andere Stand ist dann weg.")) void syncNow(true); }}>Cloud-Stand ersetzen</button>
        </>
      ) : sync.off ? <p className="muted" style={{ margin: 0 }}><Ic name="cloud" cls="ic xs" /> {sync.off}</p>
        : sync.err ? <p className="warn-text" style={{ margin: 0 }}>{sync.err}</p>
        : <p className="muted" style={{ margin: 0 }}><Ic name="cloud" cls="ic xs" /> {sync.busy ? "Gleiche ab …" : sync.at ? "Auf allen Geräten gleich (verschlüsselt)." : "Wird beim nächsten Abgleich verschlüsselt gesichert."}</p>}
    </div>
  );
}
