/**
 * Lernplan – 1:1 wie rPlan() der Live-App: alle Tage bis zur Prüfung, heute mit Knöpfen („Heute laut Lernplan“),
 * an den anderen Tagen „+ fällige Wiederholungen“. Rechnet sich bei jedem Öffnen neu aus dem Lernstand (lib/plan.ts).
 */
import { createFileRoute } from "@tanstack/react-router";
import { EXAM_DE } from "@/config";
import { fmtDay, today } from "@/lib/dates";
import { buildPlan, wdOf } from "@/lib/plan";
import { useProgress } from "@/store/progress";
import { Ic } from "@/ui-main";
import { PlanLi, TodayPlan } from "@/components/lernen/bits";
import { usePlanActions } from "@/components/tipps/actions";

export const Route = createFileRoute("/plan")({ component: Plan });

const WDL = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function Plan() {
  const S = useProgress((s) => s.S), P = buildPlan(S), t0 = today(), act = usePlanActions();
  return (
    <>
      <section className="card"><h3>Dein Lernplan bis zum {EXAM_DE}</h3><p className="small muted" style={{ marginTop: 4 }}>Alle {P.total} noch nicht grünen Fragen sind auf die Lerntage verteilt – Teil 1 zuerst, Pflichtthemen vor den übrigen, etwa {P.per} Fragen pro Tag. Sonntags: Prüfung simulieren. Mittwochs: Operator-Trainer. Jeden Tag zuerst die fälligen Wiederholungen. Der Plan rechnet sich täglich neu aus deinem Lernstand.</p></section>
      {P.days.length ? (
        <ol className="plan-days">{P.days.map((d) => (
          <li key={d} className={`${d === t0 ? "today" : ""} ${wdOf(d) === 0 ? "sun" : ""}`}><div className="pd-date"><b>{d === t0 ? "Heute" : WDL[wdOf(d)]}</b><span className="small muted">{fmtDay(d)}</span></div>
            {d === t0 ? <div className="pd-today"><TodayPlan act={act} /></div> : <ul className="plan-items"><li className="rep"><span className="small muted"><Ic name="again" cls="ic xs" /> + fällige Wiederholungen</span></li>{P.plan[d].map((it, i) => <PlanLi key={i} it={it} />)}</ul>}
          </li>
        ))}</ol>
      ) : <p className="empty">Die Prüfung ist heute oder vorbei – viel Erfolg!</p>}
    </>
  );
}
