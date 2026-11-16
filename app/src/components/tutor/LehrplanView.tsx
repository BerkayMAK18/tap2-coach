/**
 * Tab „Lehrplan“ unter Tutor: deterministisch aus Konzept-Graph, Prüfungsdatum, Muss-Themen und Fehlvorstellungen
 * (lib/lehrplan.ts). Passt sich nach jeder Sitzung an. „Öffnen“ öffnet den Chat zu Thema und Fokus des Eintrags (die KI startet mit der ersten Nachricht).
 */
import { EXAM_DE } from "@/config";
import { fmtDay, today } from "@/lib/dates";
import type { Lehrplan, PlanItem } from "@/lib/lehrplan";
import { Ic } from "@/ui-main";
import { pc, tn } from "./shared";

export function LehrplanView({ plan, onStart, busy }: { plan: Lehrplan; onStart: (tid: string, fokus: string[]) => void; busy: boolean }) {
  const max = Math.max(1, ...plan.ranking.map((r) => r.bedarf));
  const item = (it: PlanItem, k: number, isToday: boolean) => it.kind === "wiederholung" ? (
    <li key={k} className="tp-pi rep"><Ic name="again" cls="ic xs" /><div><b className="small">Wiederholung</b><p className="tiny muted">{it.grund}</p><p className="tiny">{it.topics.map(tn).join(" · ")}</p></div></li>
  ) : (
    <li key={k} className="tp-pi">
      <Ic name="target" cls="ic xs" />
      <div>
        <b className="small">{it.name}</b>
        <p className="tiny muted">{it.grund}</p>
        {it.fokus.length > 0 && <p className="tiny">Fokus: {it.fokus.map((f) => f.label).join(" · ")}</p>}
      </div>
      {isToday && <button type="button" className="btn small primary" disabled={busy} onClick={() => onStart(it.topic, it.fokus.map((f) => f.id))}>Öffnen</button>}
    </li>
  );
  return (
    <div className="tp-plan">
      <section className="card">
        <div className="row"><h3 style={{ margin: 0 }}>Dein Lehrplan bis zur Prüfung</h3><span className="spacer" /><span className="chip blue">{plan.tage > 0 ? `noch ${plan.tage} ${plan.tage === 1 ? "Tag" : "Tage"} · ${EXAM_DE}` : "Prüfung vorbei"}</span></div>
        <p className="small muted" style={{ marginBottom: 0 }}>Berechnet aus deinem Stand je Konzept (Tutor-Sitzungen und Lernrunden), Muss-Themen und offenen Fehlvorstellungen – nicht von der KI. Nach jeder Sitzung rechnet er sich neu.</p>
      </section>
      <div className="tp-plan-grid">
        <section className="card">
          <h3>Tage</h3>
          {!plan.days.length ? <p className="small muted">Kein Lerntag mehr bis zur Prüfung.</p> : (
            <ol className="tp-days">
              {plan.days.map((d, i) => (
                <li key={d.day} className={i === 0 ? "tp-today" : ""}>
                  <div className="tp-day-h"><b>{d.day === today() ? "Heute" : fmtDay(d.day)}</b>{i === 0 && <span className="chip blue">empfohlen</span>}</div>
                  <ul className="tp-items">{d.items.map((it, k) => item(it, k, i === 0))}</ul>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="card">
          <h3>Themen nach Bedarf</h3>
          <ul className="tp-rank">
            {plan.ranking.map((r) => (
              <li key={r.topic}>
                <div className="row" style={{ gap: 6 }}><span className="small">{r.name}</span><span className="spacer" /><span className="tiny muted">{pc(r.m)}</span></div>
                <div className="bar tc-mini"><i style={{ width: `${Math.round((r.bedarf / max) * 100)}%`, background: "var(--violet)" }} /></div>
                <p className="tiny muted" style={{ margin: "2px 0 0" }}>{r.grund}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
