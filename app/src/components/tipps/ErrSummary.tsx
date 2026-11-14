/** „Deine Fehlerursachen“ (errSummaryHTML() der Live-App) – Auswertung des Fehlerprotokolls mit Tipp zur häufigsten Ursache. */
import { CAUSE_TIP } from "@/lib/aufgaben";
import { dec } from "@/lib/lernen";
import { CAUSES, errSummary } from "@/lib/tipps";
import { useProgress } from "@/store/progress";
import { Ic } from "@/ui-main";

export function ErrSummary() {
  const errlog = useProgress((s) => s.S.errlog), { n, tot, rows } = errSummary(errlog);
  if (!n) return <section className="card"><h3>Deine Fehlerursachen</h3><p className="small muted" style={{ marginTop: 4 }}>Nach Real-Klausuren und Übungsaufgaben kannst du jedem Punktverlust eine Ursache zuordnen. Hier siehst du dann, woran es am häufigsten liegt – und was dagegen hilft.</p></section>;
  return (
    <section className="card"><div className="row"><h3>Deine Fehlerursachen</h3><span className="spacer" /><span className="small muted">{n} Einträge · {dec(tot)} P verloren</span></div>
      <div className="stack" style={{ marginTop: 12 }}>{rows.map(([k, v], i) => (
        <div key={k}><div className="row"><b><Ic name={CAUSES[k][1]} cls="ic xs" /> {CAUSES[k][0]}</b><span className="spacer" /><span className="small num">{dec(v)} P · {Math.round((v / tot) * 100)} %</span></div><div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${(v / tot) * 100}%` }} /></div>
          {i === 0 && <p className="small" style={{ margin: "8px 0 0" }}><b>Tipp:</b> {CAUSE_TIP[k][0]} <button type="button" className="linkbtn" data-go2={CAUSE_TIP[k][1]}>Los</button></p>}
        </div>
      ))}</div>
    </section>
  );
}
