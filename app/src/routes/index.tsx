/**
 * Übersicht – 1:1 wie rStart() der Live-App: Countdown und Prüfungsreife (hero), Reife je Prüfungsteil mit gemischter
 * Runde (parts), „Heute laut Lernplan“ mit Tagesziel und „Gezielt üben“ (Schnellstarts).
 */
import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TOPICS, allQ, inTeil, topicQ } from "@/content/catalog";
import { EXAM_DAY, EXAM_DE } from "@/config";
import { daysBetween, today } from "@/lib/dates";
import { learnList, nextTopic, perDay, tcolOf, type Kind } from "@/lib/lernen";
import { counts, isDue, reifeLabel } from "@/lib/srs";
import { useProgress } from "@/store/progress";
import { Ic, Ring, pctS } from "@/ui-main";
import { AmpBar, Legend, TodayPlan, type PlanActions } from "@/components/lernen/bits";
import { useAnimRings, useStartRound } from "@/components/lernen/ui";
import { usePlanActions } from "@/components/tipps/actions";

export const Route = createFileRoute("/")({ component: Start });

const PARTS = ["t1", "t2", "wiso"] as const;
const TEIL_K = { t1: "Planen", t2: "Algorithmen", wiso: "SoWi" };

function Start() {
  const S = useProgress((s) => s.S);
  const startRound = useStartRound(), ref = useRef<HTMLElement>(null);
  useAnimRings(ref, []);
  const all = allQ(S), c = counts(S, all), daysLeft = daysBetween(today(), EXAM_DAY), left = Math.max(0, daysLeft);
  const pd = perDay(S, left), todayN = S.log[today()] || 0;
  const nt = nextTopic(S), ntc = counts(S, topicQ(S, nt.id));
  const parts = PARTS.map((p) => { const tids = TOPICS.filter((t) => inTeil(t, p)).map((t) => t.id); return { p, c: counts(S, all.filter((q) => tids.includes(q.topic))) }; });
  const errN = c.r, markN = all.filter((q) => S.mark[q.id]).length, dueN = all.filter((q) => isDue(S, q.id)).length;
  const kind = (k: Kind) => startRound(learnList(S, k));
  const act: PlanActions = usePlanActions(), go = act.go; // Lernplan-Knöpfe wie bindPlan() der Live-App

  return (
    <>
      <section className="hero grad" ref={ref}>
        <div>
          <div className="eyebrow"><Ic name="calendar" cls="ic sm" />{daysLeft > 0 ? `Noch ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"} bis zur TAP2 am ${EXAM_DE}` : `TAP2 am ${EXAM_DE}`}</div>
          <h2>{reifeLabel(c.pct)}</h2>
          <p className="mot">{c.t - c.g} von {c.t} Fragen sind noch nicht grün. Eine Frage wird grün, wenn du sie zweimal hintereinander richtig beantwortest. Danach kommt sie nach 3, 7, 14 und 30 Tagen zur Wiederholung.</p>
          <AmpBar c={c} cls="lg" /><Legend c={c} />
          <div className="row" style={{ marginTop: 20 }}><button type="button" className="btn white" onClick={() => go("tutorial")}><Ic name="map" cls="ic sm" /> Tutorial: So lernst du am besten</button></div>
          <p className="nexthint">{dueN ? <>Als Nächstes: <b>{dueN} {dueN === 1 ? "fällige Wiederholung" : "fällige Wiederholungen"}</b>, danach {nt.n}</> : <>Als Nächstes: <b>{nt.n}</b> · {ntc.open} offene Fragen</>}</p>
        </div>
        <div className="hero-side"><Ring frac={c.pct} size={150} sw={12} cls="anim" inner={<>{Math.round(c.pct * 100)}<small>% prüfungsreif</small></>} /></div>
      </section>
      <div className="parts">
        {parts.map(({ p, c: pc }) => (
          <section key={p} className={`card part t-${tcolOf(p)}`}>
            <div className="row">
              <Ring frac={pc.pct} size={58} sw={6} cls="anim" inner={<span className="tiny">{Math.round(pc.pct * 100)}%</span>} />
              <div style={{ flex: 1, minWidth: 0 }}><span className="tiny muted">{p === "wiso" ? "SoWi · 60 Min." : p === "t1" ? "Teil 1 · 90 Min." : "Teil 2 · 90 Min."} · alle Themen</span><h3>{TEIL_K[p]}</h3></div>
            </div>
            <AmpBar c={pc} />
            <div className="row">
              <span className="tiny muted">{pc.g} von {pc.t} grün</span><span className="spacer" />
              <button type="button" className="btn small" title={`Gemischte Runde aus allen Themen: ${TOPICS.filter((x) => inTeil(x, p)).map((x) => x.n).join(", ")}`} onClick={() => startRound(learnList(S, "part", p))}><Ic name="play" cls="ic xs" /> {p === "wiso" ? "SoWi" : p === "t1" ? "Teil 1" : "Teil 2"} gemischt</button>
            </div>
          </section>
        ))}
      </div>
      <div className="grid2">
        <section className="card">
          <div className="row"><h3>Heute laut Lernplan</h3><span className="spacer" /><button type="button" className="linkbtn" onClick={() => go("plan")}>Ganzer Plan</button></div>
          <TodayPlan act={act} />
          <div className="today"><span>Heute beantwortet</span><b className="num">{todayN}{pd ? ` von ${pd}` : ""}</b></div>
          <div className="bar"><i style={{ width: `${pd ? Math.min(100, (todayN / pd) * 100) : 100}%` }} /></div>
        </section>
        <section className="card">
          <h3>Gezielt üben</h3>
          <div className="quick">
            <button type="button" className="qk" disabled={!dueN} onClick={() => kind("due")}><Ic name="again" cls="ic sm" /><span>Fällige Wiederholungen</span><b className="num">{dueN}</b></button>
            <button type="button" className="qk" disabled={!errN} onClick={() => kind("err")}><i className="amp s0" /><span>Fehlerfragen</span><b className="num">{errN}</b></button>
            <button type="button" className="qk" disabled={!c.n} onClick={() => kind("new")}><i className="amp" /><span>Neue Fragen</span><b className="num">{c.n}</b></button>
            <button type="button" className="qk" disabled={!markN} onClick={() => kind("mark")}><Ic name="star" cls="ic sm" /><span>Markierte Fragen</span><b className="num">{markN}</b></button>
            <button type="button" className="qk" onClick={() => kind("rand")}><Ic name="shuffle" cls="ic sm" /><span>20 zufällige Fragen</span><b className="num">{c.t}</b></button>
          </div>
        </section>
      </div>
    </>
  );
}
