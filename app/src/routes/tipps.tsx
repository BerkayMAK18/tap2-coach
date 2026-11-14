/**
 * Tipps – 1:1 wie rTipps() der Live-App: Operator-Trainer und Lernplan, Fehlerursachen, Prüfungstechnik (Lernpaket X01),
 * schwächste Themen und Tutorial. Knöpfe mit data-go2 navigiert das Grundgerüst (wie navTo()).
 */
import { createFileRoute } from "@tanstack/react-router";
import { EXAM_DE } from "@/config";
import { OPDRILLS, TECHNIK, weakTopics } from "@/lib/tipps";
import { useProgress } from "@/store/progress";
import { Ic } from "@/ui-main";
import { TopicRow } from "@/components/lernen/bits";
import { useOpenTopic } from "@/components/lernen/ui";
import { ErrSummary } from "@/components/tipps/ErrSummary";

export const Route = createFileRoute("/tipps")({ component: Tipps });

function Tipps() {
  const S = useProgress((s) => s.S), openTopic = useOpenTopic(), X = TECHNIK, weak = weakTopics(S);
  return (
    <>
      <div className="tip-cards">
        <button type="button" className="card tip-card" data-go2="operatoren"><Ic name="bulb" /><b>Operator-Trainer</b><span className="small muted">Wie ausführlich bei „Nennen“, „Erläutern“, „Beurteilen“? {OPDRILLS.length} Übungen.</span></button>
        <button type="button" className="card tip-card" data-go2="plan"><Ic name="calendar" /><b>Lernplan bis {EXAM_DE}</b><span className="small muted">Was du an welchem Tag lernst – passt sich deinem Stand an.</span></button>
      </div>
      <ErrSummary />
      {X && (
        <section className="card"><div className="row"><h3>So holst du die Punkte</h3><span className="spacer" /><span className="small muted">Prüfungstechnik</span></div><p className="small muted" style={{ marginTop: 4 }}>{X.relevanz}</p>
          <div className="kern-list">{X.kern.map(([h, t, c], i) => <details key={i} className="kern" open={i === 0}><summary><span className="kn">{i + 1}</span><span>{h}</span><Ic name="down" cls="ic chev" /></summary><div className="kb"><p>{t}</p>{c && <pre>{c}</pre>}</div></details>)}</div>
          {X.fallen && X.fallen.length > 0 && <div className="sub-box fallen-box"><h4><Ic name="alert" cls="ic sm" /> Hier verlieren Prüflinge Punkte</h4><ul className="fallen">{X.fallen.map((x, i) => <li key={i}><span>{x}</span></li>)}</ul></div>}
        </section>
      )}
      {weak.length > 0 && <section className="sec"><div className="sec-head"><h2>Hier holst du am meisten raus</h2><span className="spacer" /><button type="button" className="linkbtn" data-go2="lernen">Alle Themen</button></div><p className="small muted" style={{ margin: "-4px 2px 10px" }}>Pflichtthemen mit dem größten Rückstand – nach deinem Lernstand sortiert.</p><div className="tlist">{weak.map((x) => <TopicRow key={x.t.id} t={x.t} onOpen={(tid) => openTopic(tid)} />)}</div></section>}
      <section className="card tip-link"><div className="row"><Ic name="map" /><div style={{ flex: 1, minWidth: 200 }}><b>Wie lerne ich am besten mit dem Coach?</b><br /><span className="small muted">Der Lernpfad bis zur Prüfung und alle Funktionen auf einen Blick.</span></div><button type="button" className="btn small" data-go2="tutorial">Tutorial öffnen</button></div></section>
    </>
  );
}
