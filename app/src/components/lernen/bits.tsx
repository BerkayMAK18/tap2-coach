/**
 * Kleine Bausteine des Lernen-Bereichs – gleiches Markup und gleiche Klassen wie die Template-Strings der Live-App
 * (ampBar, legend, trans, topicRow, frontHTML, figHTML, ewhHTML, tmHTML, todayPlanHTML).
 */
import { TP, allQ, figFor, topicQ } from "@/content/catalog";
import type { Question, Topic } from "@/content/schema";
import { ST_LBL, ST_SHORT, qParts, situBlocks, tcolOf } from "@/lib/lernen";
import { buildPlan, type PlanItem } from "@/lib/plan";
import type { Seg } from "@/lib/search";
import { counts, isDue, type Counts } from "@/lib/srs";
import { useProgress } from "@/store/progress";
import { fmtClock, tmLeft, tmState, useTimer } from "@/store/timer";
import { Ic, pctS } from "@/ui-main";

/** Ampelpunkt: neu (ohne Klasse), s0 rot, s1 gelb, s2 grün */
export const Amp = ({ s, title }: { s: number; title?: string }) => <i className={`amp${s >= 0 ? " s" + s : ""}`} title={title} />;

export function AmpBar({ c, cls }: { c: Counts; cls?: string }) {
  const w = (n: number) => `${c.t ? (n / c.t) * 100 : 0}%`;
  return (
    <div className={`amp-bar ${cls ?? ""}`} role="img" aria-label={`${c.g} grün, ${c.y} gelb, ${c.r} rot, ${c.n} neu`}>
      <i className="g" style={{ width: w(c.g) }} /><i className="y" style={{ width: w(c.y) }} /><i className="r" style={{ width: w(c.r) }} />
    </div>
  );
}
export function Legend({ c }: { c: Counts }) {
  return <div className="legend-a"><span><i className="amp s2" />{c.g} grün</span><span><i className="amp s1" />{c.y} gelb</span><span><i className="amp s0" />{c.r} rot</span><span><i className="amp" />{c.n} neu</span></div>;
}
/** „Gelb → Grün“ */
export const Trans = ({ f, t }: { f: number; t: number }) => <span className="trans"><Amp s={f} />{ST_SHORT[f]} <Ic name="right" cls="ic xs" /> <Amp s={t} />{ST_SHORT[t]}</span>;

/** Suchtreffer mit Markierung (escaped, kein HTML) */
export const Segs = ({ segs }: { segs: Seg[] }) => <>{segs.map(([t, m], i) => (m ? <mark key={i}>{t}</mark> : t))}</>;

export function TopicRow({ t, onOpen }: { t: Topic; onOpen: (tid: string) => void }) {
  const S = useProgress((s) => s.S), c = counts(S, topicQ(S, t.id));
  return (
    <button type="button" className={`trow t-${tcolOf(t.teil)}`} data-topic={t.id} onClick={() => onOpen(t.id)}>
      <span className="tr-ic"><Ic name={t.ic ?? ""} /></span>
      <span className="tr-main"><span className="tr-t">{t.n}</span><span className="tr-m">{t.teil} · {c.t} Fragen{t.prio === "Muss" && <> · <b>Muss</b></>}</span><AmpBar c={c} /></span>
      <span className="tr-p num">{pctS(c.pct)}</span><Ic name="right" cls="ic chev" />
    </button>
  );
}

/** Frage: optionale Situation (mit Codeblöcken) + Aufgabe */
export function Front({ text }: { text: string }) {
  const [sit, task] = qParts(text);
  return (
    <>
      {sit && <div className="situ">{situBlocks(sit).map((b, i) => (b.code ? <pre key={i} className="situ-code">{b.text}</pre> : b.text))}</div>}
      <div className="front">{task}</div>
    </>
  );
}
/** UML-Bild zur Frage – nur zusammen mit der Antwort. SVG aus dem eigenen Katalog (keine Nutzerdaten). */
export function Fig({ q }: { q: Question }) {
  const f = !q.own && figFor(q.id);
  if (!f) return null;
  return <figure className="qfig"><div className="qfig-h">So sieht es im Diagramm aus</div><div className="qfig-s" dangerouslySetInnerHTML={{ __html: f.svg }} /><figcaption>{f.caption}</figcaption></figure>;
}
export const Ewh = ({ q }: { q: Question }) => (q.type === "card" && q.note ? <div className="ewh"><span className="alab">Erwartungshorizont</span><div className="ewh-b">{q.note}</div></div> : null);

/** Timer wie tmHTML() der Live-App: kompakt in der Theorie, groß (compact=false) in den Übungsaufgaben */
export function TimerBox({ k, min, label = "Start", hint, compact = true }: { k: string; min: number; label?: string; hint?: string; compact?: boolean }) {
  const { TM, start, stop, reset } = useTimer();
  useTimer((s) => s.now); // Sekundentakt
  const stt = tmState(TM, k), cc = compact ? " compact" : "";
  if (stt === "idle") return <div className={"tm" + cc}><button type="button" className={`btn ${compact ? "small" : "primary big"}`} onClick={() => start(k, min)}><Ic name="play" cls="ic sm" /> {label} · {fmtClock(min * 60)}</button>{hint && <span className="small muted">{hint}</span>}</div>;
  const left = tmLeft(TM);
  if (stt === "run") return <div className={"tm run" + cc}><span className={`tm-clock num ${left < 0 ? "over" : ""}`}>{fmtClock(left)}</span><span className="small muted">{left < 0 ? "über der Zeit" : "verbleibend"}</span><button type="button" className="btn small" onClick={stop}><Ic name="check" cls="ic xs" /> Stopp – fertig</button></div>;
  const used = (TM!.stop! - TM!.start) / 1000, over = used - min * 60;
  return <div className={"tm done" + cc}><span className="app-ok"><Ic name="check" cls="ic sm" /> Bearbeitet in {fmtClock(used)}</span><span className={`small ${over > 0 ? "warn-text" : "muted"}`}>{over > 0 ? fmtClock(over) + " über der Zeit" : "in der Zeit"}</span><button type="button" className="linkbtn" onClick={reset}>Timer zurücksetzen</button></div>;
}

const TEIL_K: Record<string, string> = { t1: "Planen", t2: "Algorithmen", wiso: "SoWi" };
export type PlanActions = { topic: (tid: string) => void; sim: (teil: string) => void; go: (view: string) => void; due: () => void };
/** Eintrag im Lernplan (planItemHTML): Knöpfe nur für heute (mit act) */
export function PlanLi({ it, act }: { it: PlanItem; act?: PlanActions }) {
  if (it.kind === "topic") { const t = TP[it.tid]; return <li><span className="pi-ic"><Ic name={t.ic ?? ""} cls="ic sm" /></span><span className="pi-t"><b>{t.n}</b><span className="small muted">{it.n} Fragen · {t.teil}</span></span>{act && <button type="button" className="btn small" onClick={() => act.topic(it.tid)}><Ic name="play" cls="ic xs" /> Lernen</button>}</li>; }
  if (it.kind === "sim") return <li><span className="pi-ic"><Ic name="timer" cls="ic sm" /></span><span className="pi-t"><b>Prüfung simulieren: {TEIL_K[it.teil]}</b><span className="small muted">{it.teil === "wiso" ? "Simulation, 60 Min." : "Real-Klausur, 90 Min."} · danach Fehlerursachen eintragen</span></span>{act && <button type="button" className="btn small" onClick={() => act.sim(it.teil)}>Starten</button>}</li>;
  if (it.kind === "op") return <li><span className="pi-ic"><Ic name="bulb" cls="ic sm" /></span><span className="pi-t"><b>Operator-Trainer</b><span className="small muted">10 Min. · Antworttiefe üben</span></span>{act && <button type="button" className="btn small" onClick={() => act.go("operatoren")}>Öffnen</button>}</li>;
  return <li><span className="pi-ic"><Ic name="star" cls="ic sm" /></span><span className="pi-t"><b>Nur wiederholen</b><span className="small muted">Fällige Fragen und Fehler, Tipps lesen, nichts Neues. Früh schlafen.</span></span>{act && <button type="button" className="btn small" onClick={() => act.go("tipps")}>Tipps</button>}</li>;
}
/** „Heute laut Lernplan“ (todayPlanHTML() der Live-App) */
export function TodayPlan({ act }: { act: PlanActions }) {
  const S = useProgress((s) => s.S), P = buildPlan(S), items = P.plan[P.days[0]] ?? [], dueN = allQ(S).filter((q) => isDue(S, q.id)).length;
  return (
    <ul className="plan-items">
      {dueN > 0 && <li><span className="pi-ic"><Ic name="again" cls="ic sm" /></span><span className="pi-t"><b>Fällige Wiederholungen</b><span className="small muted">{dueN} Fragen · zuerst erledigen</span></span><button type="button" className="btn small primary" onClick={act.due}>Starten</button></li>}
      {items.map((it, i) => <PlanLi key={i} it={it} act={act} />)}
      {!items.length && !dueN && <li><span className="pi-t small muted">Heute steht nichts Neues an.</span></li>}
    </ul>
  );
}
