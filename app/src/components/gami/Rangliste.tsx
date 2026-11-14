/**
 * Rangliste – 1:1 wie rangView()/rRang()/lbListHTML() der Live-App: Kopf mit Figur, Mitmachen bzw. Namen ändern,
 * Bestenliste (Top 100, eigener Platz), Austragen mit Rückfrage. Gleiche Tabelle tap2_lb, gleiche ID, gleiche Regeln.
 * Namen und Daten vom Server sind Fremddaten: nur als Text; Figuren nur aus bekannten Teilen (lookEq).
 */
import { useEffect, useRef } from "react";
import { lbGet, lookEq, type LbEntry } from "@/lib/gami/lb";
import { num } from "@/lib/state";
import { supabase } from "@/lib/supabase";
import { TI } from "@/lib/gami/titles";
import { gami, lbAct, lbOnRender, useGami } from "@/store/gami";
import { Fig } from "./bits";

export function Rangliste() {
  useGami((s) => s.n);
  const lbs = useGami((s) => s.lb), G = gami(), conf = !!supabase;
  useEffect(() => { if (conf) lbOnRender(); }); // bei jedem Zeichnen wie rRang(): lädt höchstens einmal pro Minute (beim Aufruf frisch)
  const lb = lbGet(), input = useRef<HTMLInputElement>(null);
  return (
    <>
      <section className="card gm-lbhead"><div className="gm-ava"><Fig c={G.char} eq={G.equip[G.char]} /></div><div><h2>Rangliste</h2><p className="small muted">{`Wer sammelt die meisten XP? Du bist Level ${G.level} mit ${G.earned.toLocaleString("de-DE")} XP.`}</p></div></section>
      {!conf ? <section className="card"><h3>Bestenliste</h3><p className="small muted">Die Bestenliste ist in dieser Version nicht verfügbar.</p></section> : <>
        {!lb.joined || lbs.edit ? (
          <section className="card"><h3>{lb.joined ? "Namen ändern" : "Mitmachen"}</h3><p className="small muted">Wähle einen Spitznamen. Für alle sichtbar sind nur dein Name, dein Level, deine XP und deine Figur. Nimm bitte nicht deinen echten Namen. Du kannst dich jederzeit wieder austragen.</p>
            <div className="row" style={{ marginTop: 10 }}><input ref={input} type="text" className="gm-in" id="gm-lb-name" maxLength={16} placeholder="z. B. CodeRabe" defaultValue={String(lb.name || "")} autoComplete="off" spellCheck={false} aria-label="Spitzname" onKeyDown={(e) => { if (e.key === "Enter") lbAct.join(e.currentTarget.value); }} /><button type="button" className="btn primary small" data-gm-lbjoin="" disabled={lbs.busy} onClick={() => lbAct.join(input.current ? input.current.value : "")}>{lb.joined ? "Speichern" : "Mitmachen"}</button>{lb.joined ? <button type="button" className="btn small ghost" data-gm-lbcancel="" onClick={lbAct.cancel}>Abbrechen</button> : null}</div>
            {lbs.err ? <p className="small warn-text" style={{ marginTop: 6 }}>{lbs.err}</p> : null}</section>
        ) : null}
        <section className="card" id="gm-lbsec"><LbList /></section>
      </>}
    </>
  );
}

function Row({ e }: { e: LbEntry }) {
  const [c, eq, ti] = lookEq(e.look);
  return <div className={`gm-lbrow ${e.me ? "me" : ""} ${e.r <= 3 ? "p" + e.r : ""}`}><span className="gm-lbr num">{num(e.r)}</span><span className="gm-lbfig"><Fig c={c} eq={eq} /></span><span className="gm-lbn"><b>{String(e.name)}</b>{e.me ? <>{" "}<span className="chip">Du</span></> : null}<span className="gm-lbl">{`Level ${+e.level || 1}${ti ? " · «" + TI[ti]!.name + "»" : ""}`}</span></span><span className="gm-lbxp num">{`${(+e.xp || 0).toLocaleString("de-DE")} XP`}</span></div>;
}
function LbList() {
  const { data: d, err, edit, leave, busy } = useGami((s) => s.lb), lb = lbGet();
  const list = !d ? <p className="small muted">{err ? err : "Lädt …"}</p>
    : !d.top.length ? <p className="small muted">Noch niemand eingetragen – sei die erste Person!</p>
    : <>{d.top.map((e, i) => <Row key={i} e={e} />)}{d.me && d.me.r > d.top.length ? <><div className="gm-lbgap">…</div><Row e={Object.assign({ me: true }, d.me)} /></> : null}</>;
  return (
    <>
      <div className="row"><h3>Bestenliste</h3><span className="spacer" /><span className="small muted">{d ? num(d.total) + " dabei" : ""}</span></div><p className="tiny muted">Sortiert nach gesammelten XP. Wird etwa jede Minute aktualisiert.</p><div className="gm-lb">{list}</div>
      {lb.joined && !edit ? <div className="row" style={{ marginTop: 12 }}><span className="small muted">Du bist dabei als <b>{String(lb.name || "")}</b>{d && d.me ? ` · Platz ${num(d.me.r)} von ${num(d.total)}` : ""}</span><span className="spacer" /><button type="button" className="btn small ghost" data-gm-lbedit="" onClick={lbAct.edit}>Namen ändern</button>{leave ? <button type="button" className="btn small danger" data-gm-lbleave2="" disabled={busy} onClick={lbAct.leave}>Wirklich austragen</button> : <button type="button" className="btn small ghost" data-gm-lbleave="" onClick={lbAct.leaveAsk}>Austragen</button>}</div> : null}
    </>
  );
}
