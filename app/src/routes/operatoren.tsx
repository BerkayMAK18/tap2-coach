/**
 * Operator-Trainer – 1:1 wie rOperatoren() der Live-App: Operator-Treppe und Training
 * „Welche Antwort erfüllt den Operator?“ (Übungen aus dem Katalog, Antworten je Übung gemischt).
 */
import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { OPDRILLS, OP_LADDER, drillOrder, nextDrill, pickDrill, startDrill } from "@/lib/tipps";
import { useDrill } from "@/store/tipps";
import { Ic } from "@/ui-main";

export const Route = createFileRoute("/operatoren")({ component: Operatoren });

function Operatoren() {
  const { d, set } = useDrill();
  useEffect(() => { if (d && d.i < d.order.length && !d.ord[d.order[d.i]]) set(drillOrder(d)); }, [d, set]);
  // Nach der Antwort „Weiter“ fokussieren (Tastatur: Enter geht weiter), wie die Live-App
  const picked0 = useRef(false), next = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (picked0.current && d?.pick != null) { picked0.current = false; next.current?.focus({ preventScroll: true }); } }, [d]);
  let drill: React.ReactNode;
  if (!d) drill = <section className="card"><h3>Training: Welche Antwort erfüllt den Operator?</h3><p className="small muted" style={{ marginTop: 4 }}>{OPDRILLS.length} kurze Aufgaben. Du wählst die Antwort, die die volle Punktzahl bekommt – und lernst, wie tief du je Operator antworten musst.</p><div className="row" style={{ marginTop: 12 }}><button type="button" className="btn primary" onClick={() => set(drillOrder(startDrill()))}><Ic name="play" cls="ic sm" /> Training starten</button></div></section>;
  else if (d.i >= d.order.length) drill = <section className="card"><h3>{d.score} von {d.order.length} richtig</h3><p className="small muted" style={{ marginTop: 4 }}>{d.score === d.order.length ? "Stark – du triffst die Antworttiefe sicher." : "Lies dir die Operator-Treppe oben noch einmal durch und starte das Training erneut."}</p><div className="row" style={{ marginTop: 12 }}><button type="button" className="btn primary" onClick={() => set(drillOrder(startDrill()))}><Ic name="again" cls="ic sm" /> Noch einmal</button></div></section>;
  else {
    const x = OPDRILLS[d.order[d.i]], picked = d.pick !== null, ord = d.ord[d.order[d.i]] ?? x.opts.map((_, k) => k);
    drill = (
      <section className="card qcard"><div className="row"><span className="chip violet">{x.op}</span><span className="spacer" /><span className="small muted num">{d.i + 1} / {d.order.length} · {d.score} richtig</span></div>
        <div className="front" style={{ marginTop: 10 }}>{x.q}</div><p className="small muted">Welche Antwort bekommt die volle Punktzahl?</p>
        <div className="optlist">{ord.map((k, pos) => <button key={k} type="button" className={`opt ${picked ? (k === x.right ? "right" : k === d.pick ? "wrong" : "") : ""}`} disabled={picked} onClick={() => { picked0.current = true; set(pickDrill(d, k)); }}><span className="k">{"ABC"[pos]}</span><span>{x.opts[k]}</span></button>)}</div>
        {picked && <div className={`feedback ${d.pick === x.right ? "ok" : "bad"}`} style={{ marginTop: 12 }}><span className="fi"><Ic name={d.pick === x.right ? "check" : "x"} /></span><div><b>{d.pick === x.right ? "Richtig" : "Nicht ganz"}</b><p>{x.why}</p></div><button type="button" className="btn primary" id="od-next" ref={next} onClick={() => set(drillOrder(nextDrill(d)))}>{d.i + 1 < d.order.length ? "Weiter" : "Auswertung"} <Ic name="right" cls="ic sm" /></button></div>}
      </section>
    );
  }
  return (
    <>
      <section className="card"><h3>Die Operator-Treppe</h3><p className="small muted" style={{ marginTop: 4 }}>Der Operator am Satzanfang bestimmt, wie ausführlich du antworten musst. Zu knapp kostet Punkte, zu ausführlich kostet Zeit. Beispiel durchgehend: Passwörter speichern.</p>
        <div className="ladder">{OP_LADDER.map(([lv, name, ops]) => <div key={lv} className="lad"><div className="lad-h"><span className="lad-n">{lv}</span><b>{name}</b></div>{ops.map(([o, t, ex]) => <div key={o} className="lad-op"><b>{o}</b><span className="small muted">{t}</span>{ex && <span className="lad-ex">{ex}</span>}</div>)}</div>)}</div>
      </section>
      {drill}
    </>
  );
}
