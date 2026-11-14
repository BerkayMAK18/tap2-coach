/**
 * Lernen – 1:1 wie rLernen() und rTopic() der Live-App:
 * - Themenliste: Gesamtkatalog mit Schnellstarts, Filter nach Prüfungsteil, Gruppen, Mehrfachauswahl mit Auswahlleiste.
 * - Themenseite (?thema=T01): Kopf mit Ring, Lernaktionen, Reiter Theorie (Lernpakete, Timer, Notation, Fallen, Ziele),
 *   Fragen (Liste, Start an einer Frage, eigene Fragen anlegen/löschen) und Aufgaben.
 * Wer über die Navigation hierher kommt, beendet eine laufende Runde (navTo("lernen") in der Live-App).
 */
import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { TAP2, TOPICS, TP, allQ, topicQ } from "@/content/catalog";
import type { Paket, Topic } from "@/content/schema";
import { ST_LBL, dec, dueCount, learnList, learnSel, learnSelOnly, qTask, selQ, tcolOf, type Kind, type Only } from "@/lib/lernen";
import { counts, isDue, st } from "@/lib/srs";
import { useProgress } from "@/store/progress";
import { Ic, Ring, pctS } from "@/ui-main";
import { AmpBar, Amp, Legend, TimerBox, TopicRow } from "@/components/lernen/bits";
import { useAnimRings, useLernenUI, useOpenTopic, useStartRound, type Tf, type TTab } from "@/components/lernen/ui";

const search = z.object({ thema: z.string().optional().catch(undefined) }); // fehlerhafte Links nie zum Absturz führen lassen
export const Route = createFileRoute("/lernen/")({ validateSearch: search, component: Lernen });

const PK = Object.fromEntries(TAP2.pakete.map((p) => [p.id, p]));
const UE = Object.fromEntries(TAP2.ueb.map((u) => [u.id, u]));
/** Aufgaben eines Themas: aus seinen Lernpaketen, ohne Doppelte (t.ueb in der Live-App) */
const uebOf = (t: Topic) => [...new Set(t.th.flatMap((id) => (PK[id] ? PK[id].ueb ?? [] : [])))].filter((u) => UE[u]);
const GROUPS: [string, (t: Topic) => boolean][] = [["Planen · Teil 1", (t) => t.teil === "Teil 1"], ["Algorithmen · Teil 2", (t) => t.teil === "Teil 2"], ["Beide IT-Teile", (t) => t.teil === "Teil 1 + 2"], ["Wirtschafts- und Sozialkunde · SoWi", (t) => t.teil === "SoWi"]];

function Lernen() {
  const { thema } = Route.useSearch();
  useEffect(() => { const st0 = useProgress.getState(); if (st0.sess) st0.setSession(null); }, []);
  if (thema && TP[thema]) return <TopicPage key={thema} t={TP[thema]} />;
  return <TopicList />;
}

function TopicList() {
  const S = useProgress((s) => s.S), { tf: f, sel } = useLernenUI();
  const startRound = useStartRound(), openTopic = useOpenTopic();
  const all = allQ(S), c = counts(S, all), markN = all.filter((q) => S.mark[q.id]).length, dueN = dueCount(S, all);
  const show = (t: Topic) => f === "alle" || (f === "SoWi" ? t.teil === "SoWi" : t.teil !== "SoWi" && t.teil.includes(f.slice(-1)));
  const kind = (k: Kind) => startRound(learnList(S, k));
  const setSel = (s: string[]) => useLernenUI.setState({ sel: s });
  const qs = selQ(S, sel), cc = counts(S, qs), selDue = dueCount(S, qs);

  return (
    <>
      <section className="card overall">
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}><span className="small muted">Gesamter Fragenkatalog</span><h2>{c.t} Fragen · {pctS(c.pct)} prüfungsreif</h2></div>
          <div className="row">
            <button type="button" className="btn small" disabled={!dueN} onClick={() => kind("due")}><Ic name="again" cls="ic xs" /> Fällig ({dueN})</button>
            <button type="button" className="btn small" disabled={!c.r} onClick={() => kind("err")}><i className="amp s0" /> Fehler ({c.r})</button>
            <button type="button" className="btn small" disabled={!markN} onClick={() => kind("mark")}><Ic name="star" cls="ic xs" /> Markiert ({markN})</button>
            <button type="button" className="btn small" onClick={() => kind("rand")}><Ic name="shuffle" cls="ic xs" /> Zufall</button>
          </div>
        </div>
        <div style={{ marginTop: 14 }}><AmpBar c={c} cls="lg" /><Legend c={c} /></div>
      </section>
      <div className="sec-head"><h2>Themen</h2><div className="filters"><div className="segs" role="group" aria-label="Prüfungsteil">
        {(["alle", "Teil 1", "Teil 2", "SoWi"] as Tf[]).map((t) => <button key={t} type="button" className={`seg ${f === t ? "on" : ""}`} aria-pressed={f === t} onClick={() => useLernenUI.setState({ tf: t })}>{t === "alle" ? "Alle" : t}</button>)}
      </div></div></div>
      <p className="small muted sel-hint"><Ic name="check" cls="ic xs" /> Tipp: Hake mehrere Themen an, um sie gemeinsam in einer Lernrunde zu üben.</p>
      {GROUPS.map(([name, fn]) => {
        const ts = TOPICS.filter((t) => fn(t) && show(t));
        return ts.length ? (
          <div key={name} className="tgroup"><h3>{name}</h3><div className="tlist">
            {ts.map((t) => (
              <div key={t.id} className="trow-sel">
                <label className="tsel" title="Für gemeinsame Lernrunde auswählen">
                  <input type="checkbox" checked={sel.includes(t.id)} aria-label={`${t.n} auswählen`} onChange={(e) => setSel(e.target.checked ? sel.concat(t.id) : sel.filter((x) => x !== t.id))} />
                  <span className="box"><Ic name="check" cls="ic xs" /></span>
                </label>
                <TopicRow t={t} onOpen={(tid) => openTopic(tid)} />
              </div>
            ))}
          </div></div>
        ) : null;
      })}
      {sel.length > 0 && (
        <div className="selbar" role="region" aria-label="Auswahl">
          <div className="sb-t"><b>{sel.length} {sel.length === 1 ? "Thema" : "Themen"}</b><span>{qs.length} Fragen · {cc.open} offen</span></div>
          <button type="button" className="btn primary small" onClick={() => startRound(learnSel(S, sel))}><Ic name="play" cls="ic xs" /> Lernrunde starten</button>
          <button type="button" className="btn small" disabled={!cc.r} title="Nur die Fehlerfragen der Auswahl – ohne Auffüllen" onClick={() => startRound(learnSelOnly(S, sel, "err" as Only))}><i className="amp s0" /> Fehler ({cc.r})</button>
          <button type="button" className="btn small" disabled={!selDue} onClick={() => startRound(learnSelOnly(S, sel, "due"))}><Ic name="again" cls="ic xs" /> Fällig ({selDue})</button>
          <button type="button" className="btn small" disabled={!cc.n} onClick={() => startRound(learnSelOnly(S, sel, "new"))}><i className="amp" /> Neue ({cc.n})</button>
          <button type="button" className="btn small ghost" onClick={() => setSel([])}>Aufheben</button>
        </div>
      )}
    </>
  );
}

function Theory({ p, idx, many }: { p: Paket; idx: number; many: boolean }) {
  const nt = p.svg ? TAP2.notation[p.svg] : null;
  return (
    <section className="card theory">
      <div className="th-head">{many && <span className="chip">Kapitel {idx + 1}</span>}<h3>{p.titel}</h3></div>
      <p className="pd-rel"><b>Warum es zählt:</b> {p.relevanz} <span className="muted">Lesezeit mit Üben ca. {dec(p.h ?? 0)} h.</span></p>
      <div className="tm-theory"><TimerBox k={"t:" + (p.id || p.titel)} min={Math.round((p.h ?? 0) * 60)} label="Lernzeit starten" /></div>
      <div className="kern-list">
        {p.kern.map(([h, t, c], i) => (
          <details key={i} className="kern" open={i === 0}>
            <summary><span className="kn">{i + 1}</span><span>{h}</span><Ic name="down" cls="ic chev" /></summary>
            <div className="kb"><p>{t}</p>{c && <pre>{c}</pre>}</div>
          </details>
        ))}
      </div>
      {/* Notationshilfe: SVG aus dem eigenen Katalog */}
      {nt && <div className="sub-box"><h4>{nt.titel}</h4><div className="notation" dangerouslySetInnerHTML={{ __html: nt.svg }} /><p className="small muted">{nt.hinweis}</p></div>}
      <div className="sub-box fallen-box"><h4><Ic name="alert" cls="ic sm" /> Hier verlieren Prüflinge Punkte</h4><ul className="fallen">{(p.fallen ?? []).map((x, i) => <li key={i}><span>{x}</span></li>)}</ul></div>
      <div className="sub-box can"><h4>Das solltest du danach können</h4><ul>{(p.ziele ?? []).map((z, i) => <li key={i}><Ic name="check" cls="ic sm" /><span>{z}</span></li>)}</ul></div>
    </section>
  );
}

function TopicPage({ t }: { t: Topic }) {
  const S = useProgress((s) => s.S), { addCustom, deleteCustom } = useProgress.getState();
  const ttab = useLernenUI((s) => s.ttab), navigate = useNavigate(), startRound = useStartRound();
  const [addQ, setAddQ] = useState(false), [confirm, setConfirm] = useState<string | null>(null), [msg, setMsg] = useState("");
  const fRef = useRef<HTMLTextAreaElement>(null), bRef = useRef<HTMLTextAreaElement>(null), headRef = useRef<HTMLElement>(null);
  const qs = topicQ(S, t.id), c = counts(S, qs), ueb = uebOf(t), dueN = dueCount(S, qs);
  const tab: TTab = ttab === "aufgaben" && !ueb.length ? "fragen" : ttab;
  const theo = t.th.map((id) => PK[id]).filter(Boolean);
  useAnimRings(headRef, [t.id]);
  useEffect(() => { if (addQ) fRef.current?.focus(); }, [addQ]);
  const act = (k: Kind) => startRound(learnList(S, k, t.id));
  const setTab = (x: TTab) => { useLernenUI.setState({ ttab: x }); setAddQ(false); setMsg(""); };
  const save = () => {
    const f = fRef.current!.value.trim(), b = bRef.current!.value.trim();
    if (!f || !b) { setMsg("Bitte Frage und Antwort ausfüllen."); return; }
    addCustom(t.id, f, b);
    fRef.current!.value = ""; bRef.current!.value = "";
    setMsg("Hinzugefügt. Du kannst direkt die nächste anlegen."); fRef.current!.focus();
  };

  return (
    <>
      <button type="button" className="backlink" onClick={() => { void navigate({ to: "/lernen", search: {} }); window.scrollTo({ top: 0 }); }}><Ic name="left" cls="ic sm" /> Alle Themen</button>
      <section className={`pd-head t-${tcolOf(t.teil)}`} ref={headRef}>
        <div className="pd-num"><Ic name={t.ic ?? ""} cls="ic lg" /></div>
        <div className="pd-title"><div className="row"><span className={`chip ${t.prio === "Muss" ? "muss" : "wichtig"}`}>{t.prio}</span><span className="chip">{t.teil}</span><span className="chip">{qs.length} Fragen</span></div><h2>{t.n}</h2><AmpBar c={c} /><Legend c={c} /></div>
        <div className="pd-actions"><Ring frac={c.pct} size={88} sw={8} cls="anim" inner={<>{Math.round(c.pct * 100)}%<small>prüfungsreif</small></>} /></div>
      </section>
      <div className="actions">
        <button type="button" className="btn primary big" onClick={() => act("learn")}><Ic name="play" cls="ic sm" /> Lernen</button>
        <button type="button" className="btn" disabled={!dueN} onClick={() => act("due")}><Ic name="again" cls="ic xs" /> Fällig ({dueN})</button>
        <button type="button" className="btn" disabled={!c.r} onClick={() => act("err")}><i className="amp s0" /> Fehler ({c.r})</button>
        <button type="button" className="btn" disabled={!c.n} onClick={() => act("new")}><i className="amp" /> Neue ({c.n})</button>
        <button type="button" className="btn" onClick={() => act("all")}>Alle ({qs.length})</button>
      </div>
      <div className="tabs-in" role="tablist">
        <button type="button" role="tab" className={tab === "theorie" ? "on" : ""} aria-selected={tab === "theorie"} onClick={() => setTab("theorie")}><Ic name="book" cls="ic sm" /> Theorie</button>
        <button type="button" role="tab" className={tab === "fragen" ? "on" : ""} aria-selected={tab === "fragen"} onClick={() => setTab("fragen")}><Ic name="list" cls="ic sm" /> Fragen <span className="cnt">{qs.length}</span></button>
        {ueb.length > 0 && <button type="button" role="tab" className={tab === "aufgaben" ? "on" : ""} aria-selected={tab === "aufgaben"} onClick={() => setTab("aufgaben")}><Ic name="pencil" cls="ic sm" /> Aufgaben <span className="cnt">{ueb.length}</span></button>}
      </div>
      {tab === "theorie" && (
        <div className="stack">
          {theo.map((p, i) => <Theory key={p.id} p={p} idx={i} many={theo.length > 1} />)}
          <div className="row"><button type="button" className="btn primary big" onClick={() => act("learn")}><Ic name="play" cls="ic sm" /> Jetzt Fragen üben</button></div>
        </div>
      )}
      {tab === "fragen" && (
        <section className="card">
          <div className="row"><span className="small muted">Tippe eine Frage an, um dort zu starten.</span><span className="spacer" /><button type="button" className="btn small" onClick={() => { setAddQ(true); fRef.current?.focus(); }}><Ic name="plus" cls="ic xs" /> Eigene Frage</button></div>
          {addQ && (
            <div className="addq">
              <label className="f" htmlFor="add-f">Frage<textarea id="add-f" ref={fRef} rows={2} placeholder="z. B. Was ist der Unterschied zwischen PUT und PATCH?" /></label>
              <label className="f" htmlFor="add-b">Antwort<textarea id="add-b" ref={bRef} rows={4} /></label>
              <div className="row"><button type="button" className="btn primary" onClick={save}>Frage hinzufügen</button><button type="button" className="btn ghost" onClick={() => { setAddQ(false); setMsg(""); }}>Schließen</button><span className="small muted">{msg}</span></div>
            </div>
          )}
          <ul className="qlist">
            {qs.map((q, i) => {
              const s = st(S, q.id);
              return (
                <li key={q.id}>
                  <button type="button" className="qrow" onClick={() => startRound({ list: qs, title: t.n + ": Alle Fragen", src: { kind: "all", tid: t.id }, startAt: i })}>
                    <Amp s={s} title={ST_LBL[s]} /><span className="qt">{qTask(q.q)}</span>
                    {isDue(S, q.id) && s > 0 && <span className="duechip" title="Wiederholung fällig">fällig</span>}
                    {S.mark[q.id] && <span className="mk"><Ic name="star" cls="ic xs" /></span>}
                    <span className="qty">{q.type === "mc" ? "Auswahl" : q.own ? "Eigene" : "Wissen"}</span>
                  </button>
                  {q.own && (confirm === q.id
                    ? <button type="button" className="btn small danger" onClick={() => { deleteCustom(t.id, q.id); setConfirm(null); }}>Löschen?</button>
                    : <button type="button" className="iconbtn sm" aria-label="Eigene Frage löschen" onClick={() => setConfirm(q.id)}><Ic name="x" cls="ic xs" /></button>)}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {tab === "aufgaben" && (
        <div className="ueb-list">
          {ueb.map((id) => {
            const u = UE[id], r = S.ueb[id], pct = r ? r.p / u.max : null;
            return (
              // Aufgaben-Bereich ist ein eigenes Modul (noch nicht portiert) – der Klick führt dorthin
              <button key={id} type="button" className={`ueb-item t-${tcolOf(u.teil)}`} onClick={() => { void navigate({ to: "/aufgaben" }); window.scrollTo({ top: 0 }); }}>
                <span className="id">{id}</span>
                <span><span className="t">{u.titel}</span><br /><span className="sub">{u.teil} · {u.max} P · ca. {u.min} Min.</span></span>
                <span className="r">{r ? <span className={`chip ${pct! >= 0.81 ? "ok" : pct! >= 0.67 ? "warn" : "bad"}`}><span className="d" />{r.p}/{u.max}</span> : <span className="chip">offen</span>}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
