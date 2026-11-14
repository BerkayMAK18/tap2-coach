/**
 * Prüfung – 1:1 wie rPK(), rSim() und rReal() der Live-App:
 * - Start: Simulation oder Real-Klausur, Prüfungsteil, „Bereit für eine 1?“, Prüfungstechnik, Ergebnisse (löschbar).
 * - Simulation: 30 Auswahlfragen mit Zeitlimit, Fragenübersicht, Tasten 1–4/A–D und ← →; Auswertung mit Note.
 * - Real-Klausur: vier offene Aufgaben in 90 Minuten, danach Bewertung wie ein Prüfer (Erwartungshorizont,
 *   Operator-Hinweis, Stufen, Fehlerursachen) und Ergebnis je Aufgabe.
 * Die laufende Prüfung liegt in store/pruefung.ts (tap2coach-run); wer mit fertigem Ergebnis die Seite verlässt
 * und wiederkommt, sieht wieder den Start (navTo("pruefung") in der Live-App).
 */
import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TAP2, TP, allQ } from "@/content/catalog";
import { CauseChips } from "@/components/aufgaben/CauseChips";
import { Front } from "@/components/lernen/bits";
import { useAnimRings } from "@/components/lernen/ui";
import { fmtDay } from "@/lib/dates";
import { dec, qTask } from "@/lib/lernen";
import { LETTERS, MODE_LBL, SIM_MIN, STEP_LBL, TEIL, fmtT, left, n1ok, opHint, pause, realStats, resume, runsFor, setAns, setGot, steps, toggleCause, type PkRun } from "@/lib/pruefung";
import { counts } from "@/lib/srs";
import { note } from "@/lib/state";
import { useProgress } from "@/store/progress";
import { usePruefung } from "@/store/pruefung";
import { fmtClock } from "@/store/timer";
import { Ic, Ring, pctS } from "@/ui-main";

export const Route = createFileRoute("/pruefung")({ component: Pruefung });

const top = () => window.scrollTo({ top: 0 });

function Pruefung() {
  const run = usePruefung((s) => s.run);
  useEffect(() => { const P = usePruefung.getState(); if (P.run && P.run.phase === "done") P.close(); P.setConfirm(null); }, []);
  if (run && run.mode === "sim") return run.phase === "done" ? <SimDone r={run} /> : <SimWrite r={run} />;
  if (run) return run.phase === "write" ? <RealWrite r={run} /> : run.phase === "grade" ? <RealGrade r={run} /> : <RealDone r={run} />;
  return <Start />;
}

const GradeBadge = ({ n }: { n: number }) => <span className={`g g${n}`}>{n}</span>;

function Start() {
  const S = useProgress((s) => s.S), { pk, confirm, setPk, setConfirm, start, deleteRun } = usePruefung();
  const ref = useRef<HTMLDivElement>(null);
  const p = pk.mode === "real" && !(pk.teil === "t1" || pk.teil === "t2") ? { ...pk, teil: "t1" } : pk;
  useEffect(() => { if (p !== pk) setPk(p); });
  useAnimRings(ref, []);
  const hist = S.runs.slice().reverse(), cat = counts(S, allQ(S));
  const teile = p.mode === "sim" ? ["t1", "t2", "wiso", "mix"] : ["t1", "t2"];
  return (
    <>
      <div className="grid2" ref={ref}>
        <section className="card">
          <h3>Prüfung simulieren</h3>
          <div className="modes">
            <button type="button" className={`mode t-violet ${p.mode === "sim" ? "on" : ""}`} aria-pressed={p.mode === "sim"} onClick={() => setPk({ mode: "sim" })}><span className="mi"><Ic name="list" /></span><b>Simulation</b><span>30 Auswahlfragen mit Zeitlimit, Frage für Frage. Note am Ende; deine Antworten zählen in den Lernstand.</span></button>
            <button type="button" className={`mode t-blue ${p.mode === "real" ? "on" : ""}`} aria-pressed={p.mode === "real"} onClick={() => setPk({ mode: "real" })}><span className="mi"><Ic name="pencil" /></span><b>Real-Klausur</b><span>Wie in der echten Prüfung: vier offene Aufgaben à rund 25 Punkte in 90 Minuten. Danach bewertest du wie ein IHK-Prüfer mit Erwartungshorizont und Operator-Hinweisen.</span></button>
          </div>
          <label className="f" htmlFor="pk-teil">Prüfungsteil<select id="pk-teil" value={p.teil} onChange={(e) => setPk({ teil: e.target.value })}>{teile.map((t) => <option key={t} value={t}>{TEIL[t].k}{t === "mix" ? " (alle Teile)" : " – " + TEIL[t].n}</option>)}</select></label>
          <div className="row" style={{ marginTop: 18 }}><button type="button" className="btn primary big" onClick={() => { start(p.mode, p.teil); top(); }}><Ic name="play" cls="ic sm" /> Starten · {fmtClock((p.mode === "sim" ? SIM_MIN[p.teil] || 45 : 90) * 60)}</button><span className="small muted">{p.mode === "sim" ? `30 Fragen · ${SIM_MIN[p.teil] || 45} Minuten` : "90 Minuten · Papier für Skizzen bereitlegen"}</span></div>
        </section>
        <section className="card">
          <h3>Bereit für eine 1?</h3>
          <p className="small muted" style={{ marginTop: 4 }}>Prüferblick: Das Wissen sitzt, und du schaffst es unter Prüfungsbedingungen.</p>
          <ul className="n1">
            <li className={cat.pct >= 0.9 ? "ok" : ""}><span className="n1-i">{cat.pct >= 0.9 && <Ic name="check" cls="ic sm" />}</span><span><b>Fragenkatalog</b><br /><span className="tiny muted">mindestens 90 % prüfungsreif</span></span><span className={`chip ${cat.pct >= 0.9 ? "yellow" : ""}`}>{pctS(cat.pct)}</span></li>
            {["t1", "t2", "wiso"].map((t) => {
              const rs = runsFor(S, t), ok = n1ok(S, t), good = rs.filter((x) => x.pct >= 92).length;
              return <li key={t} className={ok ? "ok" : ""}><span className="n1-i">{ok && <Ic name="check" cls="ic sm" />}</span><span><b>{TEIL[t].k}</b><br /><span className="tiny muted">{t === "wiso" ? "zwei Simulationen in Folge ab 92 %" : "zwei Real-Klausuren in Folge ab 92 %"}{rs.length ? " · zuletzt " + rs.map((x) => x.pct + " %").join(", ") : ""}</span></span><span className={`chip ${ok ? "yellow" : ""}`}>{good}/2</span></li>;
            })}
          </ul>
        </section>
      </div>
      <section className="card tip-link"><div className="row"><Ic name="bulb" /><div style={{ flex: 1, minWidth: 200 }}><b>Prüfungstechnik</b><br /><span className="small muted">Operatoren, Zeiteinteilung und typische Punktverluste findest du unter Tipps.</span></div><button type="button" className="btn small" data-go2="tipps">Zu den Tipps</button></div></section>
      <section className="card"><div className="row"><h3>Deine Ergebnisse</h3><span className="spacer" /><span className="small muted">{hist.length} {hist.length === 1 ? "Durchgang" : "Durchgänge"}</span></div>
        {hist.length ? (
          <div className="res-list">{hist.map((x, k) => (
            <div key={(x.ts ?? 0) + "-" + k} className="res"><GradeBadge n={x.note} /><div><div className="t">{MODE_LBL[x.mode] || x.mode} · {TEIL[x.teil] ? TEIL[x.teil].k : x.teil}</div><div className="s">{fmtDay(x.at)}{x.detail ? " · " + x.detail : ""} · {x.pct >= 50 ? "bestanden" : "nicht bestanden"}</div></div><span className="chip num">{x.pct} %</span>
              {confirm === x.ts && x.ts != null ? <button type="button" className="btn small danger del" onClick={() => deleteRun(x.ts!)}>Wirklich löschen</button> : <button type="button" className="iconbtn sm del" aria-label="Ergebnis löschen" onClick={() => setConfirm(x.ts ?? null)}><Ic name="x" cls="ic xs" /></button>}
            </div>
          ))}</div>
        ) : <p className="empty">Noch keine Prüfung geschrieben. Starte mit einer Simulation.</p>}
      </section>
    </>
  );
}

/** Zeitleiste mit Pause/Weiter, Abgeben, Abbrechen und Rückfragen (timerBar() der Live-App). Läuft die Zeit ab, wird abgegeben. */
function TimerBar({ r, extra }: { r: PkRun; extra?: React.ReactNode }) {
  const { confirm, setConfirm, patch, submit, close } = usePruefung();
  usePruefung((s) => s.now); // Takt
  const l = left(r);
  useEffect(() => { if (r.on && r.phase === "write" && l <= 0) submit(true); }, [l, r.on, r.phase, submit]);
  const open = r.mode === "sim" ? r.qs!.filter((q) => q.pick === null).length : 0;
  return (
    <div className="timerbar"><span className={`timer ${l < 600000 ? "low" : ""}`}><Ic name="timer" /><span id="pk-time">{fmtT(l)}</span></span>{extra}<span className="spacer" />
      {r.on ? <button type="button" className="btn" onClick={() => patch((x) => pause(x))}>Pause</button> : <button type="button" className="btn" onClick={() => patch((x) => resume(x))}>{r.used ? "Weiter" : "Start"}</button>}
      <button type="button" className="btn primary" onClick={() => setConfirm("submit")}>Abgeben</button><button type="button" className="btn small ghost" onClick={() => setConfirm("cancel")}>Abbrechen</button>
      {confirm === "submit" && <div className="confirm"><span className="small">{open ? `${open} ${open === 1 ? "Frage ist" : "Fragen sind"} noch offen. ` : ""}Wirklich abgeben? Danach kannst du nichts mehr ändern.</span><button type="button" className="btn small primary" onClick={() => { submit(false); top(); }}>Ja, abgeben</button><button type="button" className="btn small" onClick={() => setConfirm(null)}>Weiterschreiben</button></div>}
      {confirm === "cancel" && <div className="confirm"><span className="small">Abbrechen verwirft diese Prüfung.</span><button type="button" className="btn small danger" onClick={() => { close(); top(); }}>Verwerfen</button><button type="button" className="btn small" onClick={() => setConfirm(null)}>Zurück</button></div>}
    </div>
  );
}

function SimWrite({ r }: { r: PkRun }) {
  const { patch, setConfirm } = usePruefung();
  const qs = r.qs!, i = r.i ?? 0, q = qs[i], answered = qs.filter((x) => x.pick !== null).length;
  const pick = (k: number) => patch((x) => ({ ...x, qs: x.qs!.map((y, j) => (j === (x.i ?? 0) ? { ...y, pick: k } : y)) }));
  const goQ = (k: number) => patch((x) => ({ ...x, i: k }));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || usePruefung.getState().confirm) return;
      const k = e.key.toLowerCase(), idx = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k);
      if (idx >= 0 && idx < q.opts.length) { e.preventDefault(); pick(idx); }
      else if (e.key === "ArrowRight" && i < qs.length - 1) goQ(i + 1);
      else if (e.key === "ArrowLeft" && i > 0) goQ(i - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  return (
    <>
      <TimerBar r={r} extra={<span className="small muted num">{answered} / {qs.length} beantwortet</span>} />
      <div className="quiz">
        <div className="navgrid" aria-label="Fragenübersicht">{qs.map((x, k) => <button key={k} type="button" className={`${x.pick !== null ? "ans" : ""} ${k === i ? "cur" : ""}`} aria-label={`Frage ${k + 1}${x.pick !== null ? ", beantwortet" : ""}`} onClick={() => goQ(k)}>{k + 1}</button>)}</div>
        <section className="card qcard"><div className="qlab"><span className="chip violet">Frage {i + 1} von {qs.length}</span><span className="chip">{TP[q.topic] ? TP[q.topic].n : ""}</span></div>
          <Front text={q.q} />
          <div className="optlist">{q.opts.map((o, k) => <button key={k} type="button" className={`opt ${q.pick === k ? "picked" : ""}`} aria-pressed={q.pick === k} onClick={() => pick(k)}><span className="k">{"ABCD"[k]}</span><span>{o}</span></button>)}</div>
        </section>
        <div className="study-nav"><button type="button" className="btn ghost" disabled={i === 0} onClick={() => goQ(i - 1)}><Ic name="left" cls="ic sm" /> Zurück</button><span className="kbdhelp"><span className="kbd">1</span>–<span className="kbd">4</span> antworten · <span className="kbd">←</span> <span className="kbd">→</span> blättern</span>{i < qs.length - 1 ? <button type="button" className="btn primary" onClick={() => goQ(i + 1)}>Weiter <Ic name="right" cls="ic sm" /></button> : <button type="button" className="btn primary" onClick={() => { setConfirm("submit"); top(); }}>Abgeben</button>}</div>
      </div>
    </>
  );
}

function Hero({ r, pct, small, h2, chips, again }: { r: PkRun; pct: number; small: string; h2: string; chips: React.ReactNode; again: React.ReactNode }) {
  const { start, close } = usePruefung(), ref = useRef<HTMLElement>(null);
  useAnimRings(ref, []);
  return (
    <section className="result-hero grad" ref={ref}><Ring frac={pct / 100} size={150} sw={12} inner={<>{pct}%<small>{small}</small></>} cls="anim" /><div><span className="eyebrow">{MODE_LBL[r.mode]} {TEIL[r.teil].k}</span><h2>{h2}</h2><div className="chips">{chips}</div>
      <div className="row"><button type="button" className="btn white" onClick={() => { start(r.mode, r.teil); top(); }}>{again}</button><button type="button" className="btn glass" onClick={() => { close(); top(); }}>Zur Übersicht</button></div></div></section>
  );
}

function SimDone({ r }: { r: PkRun }) {
  const qs = r.qs!, pct = r.pct ?? 0, right = qs.filter((q) => q.pick === q.right).length;
  return (
    <>
      <Hero r={r} pct={pct} small="richtig" h2={`${pct >= 50 ? "Bestanden" : "Nicht bestanden"} · Note ${note(pct)}`} again={<><Ic name="again" cls="ic sm" /> Neue Simulation</>}
        chips={<><span className="chip">{right} von {qs.length} richtig</span><span className="chip"><Ic name="clock" cls="ic xs" /> {Math.round(r.used / 60000)} Min.</span>{r.auto && <span className="chip">Zeit abgelaufen</span>}<span className="chip">Note 1 ab 92 %</span></>} />
      <section className="card"><h3>Auswertung</h3>{qs.map((q, i) => (
        <div key={i} className={`review ${q.pick === q.right ? "ok" : "bad"}`}><span className="ri"><Ic name={q.pick === q.right ? "check" : "x"} /></span><div><b>{i + 1}. {qTask(q.q)}</b><br /><span className="small">Deine Antwort: {q.pick === null ? "keine" : q.opts[q.pick]}{q.pick !== q.right ? ` · Richtig: ${q.opts[q.right]}` : ""}{q.why ? " · " + q.why : ""}</span></div></div>
      ))}</section>
    </>
  );
}

const Tables = () => <div style={{ marginTop: 12 }}><span className="small muted">Tabellen</span><pre>{TAP2.sqlSchema}</pre></div>;

function RealWrite({ r }: { r: PkRun }) {
  const { patch, setConfirm } = usePruefung(), { total } = realStats(r);
  return (
    <>
      <TimerBar r={r} />
      <section className="card"><h2>Real-Klausur {TEIL[r.teil].k}</h2><p className="small muted" style={{ marginTop: 6 }}>{TEIL[r.teil].n} · 4 Aufgaben · {total} Punkte · 90 Minuten. Diagramme auf Papier skizzieren und hier Stichpunkte notieren. Antworten werden auf diesem Gerät zwischengespeichert.</p></section>
      {r.auf!.map((a, ai) => (
        <section key={ai} className="card"><div className="row"><h3>{ai + 1}. Aufgabe: {a.title}</h3><span className="spacer" /><span className="chip blue">{a.items.reduce((b, i) => b + i.p, 0)} P</span></div>
          {a.items.some((i) => i.schema) && <Tables />}
          {a.items.map((it, ii) => (
            <div key={ii} className="sub-q"><div className="row"><b>{LETTERS[ii]})</b><span className="spacer" /><span className="small muted">{it.p} Punkte</span></div><div className="qtext">{it.q}</div><label className="sr" htmlFor={`ans-${ai}-${ii}`}>Antwort zu Aufgabe {ai + 1}{LETTERS[ii]}</label><textarea id={`ans-${ai}-${ii}`} rows={it.p >= 15 ? 12 : 5} placeholder="Deine Antwort" value={it.ans} onChange={(e) => patch((x) => setAns(x, ai, ii, e.target.value))} /></div>
          ))}
        </section>
      ))}
      <div className="row"><button type="button" className="btn primary big" onClick={() => { setConfirm("submit"); top(); }}>Abgeben und bewerten</button></div>
    </>
  );
}

/** Punkte-Feld: übernimmt den Wert wie die Live-App erst beim Verlassen/Enter (change-Ereignis) */
function GotInput({ id, max, got, onSet }: { id: string; max: number; got: number | null; onSet: (v: number) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current && document.activeElement !== ref.current) ref.current.value = got == null ? "" : String(got); }, [got]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const h = () => { const v = parseFloat(el.value); if (!Number.isNaN(v)) onSet(v); };
    el.addEventListener("change", h); return () => el.removeEventListener("change", h);
  }, [onSet]);
  return <input ref={ref} type="number" id={id} min={0} max={max} step={0.5} defaultValue={got ?? ""} />;
}

function RealGrade({ r }: { r: PkRun }) {
  const { patch, finish } = usePruefung(), { all, graded, got, pct } = realStats(r);
  return (
    <>
      <div className="timerbar"><h2 style={{ fontSize: "1.25rem" }}>Bewerten</h2><span className="spacer" /><span className="chip blue num">{graded}/{all.length} bewertet · {dec(got)} P</span></div>
      <p className="small muted">{r.auto ? "Die Zeit ist abgelaufen. " : ""}Bewerte wie ein IHK-Prüfer: volle Punkte nur, wenn alle erwarteten Aspekte da sind und der Operator erfüllt ist. Andere sachlich richtige Lösungen zählen voll.</p>
      {r.auf!.map((a, ai) => (
        <section key={ai} className="card"><h3>{ai + 1}. Aufgabe: {a.title}</h3>
          {a.items.map((it, ii) => {
            const op = opHint(it.q);
            return (
              <div key={ii} className="sub-q"><div className="row"><b>{LETTERS[ii]})</b>{op && <span className="chip violet">{op[0]}</span>}<span className="spacer" /><span className="small muted">{it.p} P</span></div><div className="qtext small">{it.q}</div>
                {op && <p className="ophint">{op[1]}</p>}
                <div className="grade-grid"><div><span className="small muted">Deine Antwort</span><pre className="mine">{it.ans || "(leer)"}</pre></div><div><span className="small muted">Erwartungshorizont</span><pre>{it.a}</pre></div></div>
                <div className="row steps">{steps(it.p).map((v, k) => <button key={k} type="button" className={`btn small ${it.got === v ? "sel" : ""}`} aria-pressed={it.got === v} onClick={() => patch((x) => setGot(x, ai, ii, v))}>{STEP_LBL[k]}{k && k < 4 ? ` · ${dec(v)}` : ""}</button>)}<label className="f inline" htmlFor={`g-${ai}-${ii}`}>Punkte <GotInput id={`g-${ai}-${ii}`} max={it.p} got={it.got} onSet={(v) => patch((x) => setGot(x, ai, ii, v))} /></label></div>
                {it.got !== null && it.got < it.p && <div className="cause-box"><span className="small muted">Warum fehlen {dec(it.p - it.got)} P?</span><CauseChips sel={it.cause} onPick={(c) => patch((x) => toggleCause(x, ai, ii, c))} /></div>}
              </div>
            );
          })}
        </section>
      ))}
      <div className="row"><button type="button" className="btn primary big" disabled={graded !== all.length} onClick={() => { finish(); top(); }}>Ergebnis speichern ({pct} %)</button><span className="small muted">{graded === all.length ? "" : "Bitte alle Teilaufgaben bewerten."}</span></div>
    </>
  );
}

function RealDone({ r }: { r: PkRun }) {
  const { total, got, pct } = realStats(r);
  return (
    <>
      <Hero r={r} pct={pct} small="Punkte" h2={`${dec(got)} von ${total} Punkten · Note ${note(pct)}`} again={`Neue Real-Klausur ${TEIL[r.teil].k}`}
        chips={<><span className="chip">{pct >= 50 ? "bestanden" : "nicht bestanden"}</span><span className="chip"><Ic name="clock" cls="ic xs" /> {Math.round(r.used / 60000)} Min.</span><span className="chip">Note 1 ab 92 %</span></>} />
      <section className="card"><h3>Punkte je Aufgabe</h3><div className="stack" style={{ marginTop: 14 }}>{r.auf!.map((a, ai) => {
        const g = a.items.reduce((b, i) => b + (i.got || 0), 0), m = a.items.reduce((b, i) => b + i.p, 0);
        return <div key={ai}><div className="row"><b>{ai + 1}. {a.title}</b><span className="spacer" /><span className="small num">{dec(g)} / {m} P</span></div><div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${(g / m) * 100}%` }} /></div></div>;
      })}</div></section>
    </>
  );
}
