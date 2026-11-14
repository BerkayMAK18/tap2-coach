/**
 * Lernrunde – 1:1 wie rSess() und rSessEnd() der Live-App:
 * - Auswahlfrage: erst „Antwortmöglichkeiten zeigen“, Optionen gemischt (A–D), Wertung sofort beim Antippen,
 *   „War geraten“ setzt eine richtige Antwort auf höchstens gelb (morgen wieder).
 * - Wissensfrage: eigene Antwort in Stichpunkten (optional), aufdecken, selbst einschätzen (nicht gewusst/unsicher/sicher).
 * - Code-Karte: Lösung im Editor tippen (SQL auch ausführen), dann mit der Musterlösung vergleichen.
 * - Tasten wie in der Live-App, Markieren, Fehler melden, Ergebnis mit Wiederholung der Fehler.
 * Die Runde ist gespeichert (tap2coach-sess, gleiches Format): Neuladen setzt an derselben Stelle fort.
 */
import { useEffect, useMemo, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TAP2, TP, getQ } from "@/content/catalog";
import type { Question } from "@/content/schema";
import { shuffle } from "@/lib/dates";
import { evById, evPassFallback, kapMastered, learnEv, learnEvFinal, type EvRes } from "@/lib/events";
import { ST_LBL, looksCode, nextRound, qTask, reportUrl, tcolOf } from "@/lib/lernen";
import { counts, nextTxt, st } from "@/lib/srs";
import { gm, useGamiTick } from "@/legacy/gami-env";
import { useProgress, type Session } from "@/store/progress";
import { Ic } from "@/ui-main";
import { AmpBar, Amp, Ewh, Fig, Front, Legend, Trans } from "@/components/lernen/bits";
import { CodeEditor } from "@/components/lernen/CodeEditor";
import { SqlAuto, SqlPanel } from "@/components/lernen/Sql";
import { useLernenUI, useStartRound } from "@/components/lernen/ui";

export const Route = createFileRoute("/lernen/runde")({ component: Runde });

const LANG_N: Record<string, string> = { pseudo: "Pseudocode", sql: "SQL" };
const codeLang = (q: Question) => (!q.own ? TAP2.codeLang[q.id] : undefined);
const S0 = () => useProgress.getState();
/** Laufende Runde ändern und speichern (keepSess() der Live-App) */
const patch = (p: Partial<Session>) => { const s = S0().sess; if (s) S0().setSession({ ...s, ...p }); };
const focusSel = (sel: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true }));
const focusMain = () => requestAnimationFrame(() => (document.querySelector<HTMLElement>("#s-opts") || document.querySelector<HTMLElement>("#s-reveal") || document.querySelector<HTMLElement>(".opt:not(:disabled)"))?.focus({ preventScroll: true }));

// ---------- Aktionen (pickMCq, reveal, markGuess, rateCard, sessNext der Live-App)
function sessNext() {
  const s = S0().sess; if (!s) return;
  patch({ i: s.i + 1, pick: null, rev: false, optOpen: false, own: "" });
  window.scrollTo({ top: 0 }); focusMain();
}
function pick(i: number) {
  const s = S0().sess; if (!s || s.pick !== null) return;
  const q = getQ(S0().S, s.ids[s.i]); if (!q || q.type !== "mc") return;
  const ok = i === q.right, [f, t] = S0().answer(q.id, ok);
  patch({ pick: i, res: { ...s.res, [q.id]: { ok, f, t } }, last: null });
  gm("answer", q, ok, false, f, t);
  focusSel("#s-next");
}
function reveal() { patch({ rev: true }); focusSel("#s-yes"); }
function markGuess() {
  const s = S0().sess; if (!s) return;
  const q = getQ(S0().S, s.ids[s.i]); if (!q) return;
  const r = s.res[q.id];
  if (S0().S.q[q.id] && r && r.ok) { S0().markGuess(q.id); patch({ res: { ...s.res, [q.id]: { ...r, t: 1, guess: true } } }); gm("guess", q); }
  sessNext();
}
function rateCard(ok: boolean, unsure = false) {
  const s = S0().sess; if (!s || !s.rev) return;
  const q = getQ(S0().S, s.ids[s.i]); if (!q) return;
  const [f, t] = S0().answer(q.id, ok, unsure);
  patch({ res: { ...s.res, [q.id]: { ok, f, t } }, last: { ok, f, t, id: q.id } });
  gm("answer", q, ok, !!unsure, f, t);
  sessNext();
}
/** Gemischte Reihenfolge der Optionen, je Frage einmal festgelegt und gespeichert (optOrder()). */
function ensureOrd(q: Question & { type: "mc" }) {
  const s = S0().sess; if (!s) return;
  if (!s.ord?.[q.id]) patch({ ord: { ...(s.ord ?? {}), [q.id]: shuffle(q.opts.map((_, i) => i)) } });
}

function Runde() {
  const sess = useProgress((s) => s.sess), S = useProgress((s) => s.S), navigate = useNavigate();
  useGamiTick((t) => t.n);
  // Lernrunde = Fokusmodus (auf dem Handy ohne Navigationsleiste), wie body.focus in der Live-App
  useEffect(() => { document.body.classList.add("focus"); return () => document.body.classList.remove("focus"); }, []);
  // Ohne laufende Runde (z. B. direkt aufgerufen) zur Themenliste; Beenden navigiert selbst
  useEffect(() => { if (!S0().sess) void navigate({ to: "/lernen", replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const closeSess = () => {
    const src = S0().sess?.src;
    S0().setSession(null);
    // Event-Runden: zurück zum Event (closeSess() der Live-App)
    if (src?.ev) void navigate({ to: "/events", search: { ev: src.ev } });
    else void navigate({ to: "/lernen", search: src?.tid ? { thema: src.tid } : {} });
    window.scrollTo({ top: 0 });
  };
  // Fragen, die es nicht mehr gibt (z. B. gelöschte eigene Karte), überspringen
  let i = sess ? sess.i : 0;
  while (sess && i < sess.ids.length && !getQ(S, sess.ids[i])) i++;
  useEffect(() => { if (sess && i !== sess.i) patch({ i }); });
  if (!sess) return null;
  if (i >= sess.ids.length) return <SessEnd sess={sess} close={closeSess} />;
  return <QuestionView key={sess.ids[i] + ":" + i} sess={sess} q={getQ(S, sess.ids[i])!} at={i} close={closeSess} />;
}

function QuestionView({ sess: s, q, at, close }: { sess: Session; q: Question; at: number; close: () => void }) {
  const S = useProgress((x) => x.S), toggleMark = useProgress((x) => x.toggleMark);
  const ref = useRef<HTMLDivElement>(null), sqlRun = useRef<(() => void) | null>(null);
  const t = TP[q.topic] ?? { n: q.topic, teil: "Event" }, sv = st(S, q.id), marked = !!S.mark[q.id];
  const mixed = (s.src.tid && q.topic !== s.src.tid) || (s.src.tids && !s.src.tids.includes(q.topic));
  const multi = !s.src.tid || mixed;
  const lang = codeLang(q);
  const fallbackOrd = useMemo(() => (q.type === "mc" ? shuffle(q.opts.map((_, i) => i)) : []), [q.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const ord = s.ord?.[q.id] ?? fallbackOrd;
  useEffect(() => { if (q.type === "mc" && (s.optOpen || s.pick !== null) && !s.ord?.[q.id]) patch({ ord: { ...(s.ord ?? {}), [q.id]: fallbackOrd } }); });
  useEffect(() => { focusMain(); }, []);
  // Schmale Bildschirme: Diagramm so weit seitlich scrollen, dass das rot markierte Element sichtbar ist (figFocus())
  useEffect(() => {
    const sc = ref.current?.querySelector<HTMLElement>(".qfig-s"); if (!sc || sc.scrollWidth <= sc.clientWidth + 2) return;
    const hs = [...sc.querySelectorAll(".fg-hl, .fg-hlt, .fg-hlb, .fg-hlf")]; if (!hs.length) return;
    const b = sc.getBoundingClientRect(), rs = hs.map((h) => h.getBoundingClientRect()), l = Math.min(...rs.map((r) => r.left)), r = Math.max(...rs.map((r) => r.right));
    sc.scrollLeft = Math.max(0, sc.scrollLeft + (l + r) / 2 - (b.left + b.width / 2));
  }, [s.pick, s.rev]);
  const openOpts = () => { if (q.type === "mc") ensureOrd(q); patch({ optOpen: true }); focusSel(".opt:not(:disabled)"); };

  // Tastenkürzel der Lernrunde (wie in der Live-App)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || useLernenUI.getState().srchOpen) return;
      const s1 = S0().sess; if (!s1) return;
      const k = e.key.toLowerCase();
      if (e.key === "Escape") { close(); return; }
      if (q.type === "mc") {
        const idx = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k);
        if (s1.pick === null && !s1.optOpen) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); openOpts(); } }
        else if (s1.pick === null && idx >= 0 && idx < q.opts.length) { e.preventDefault(); pick((s1.ord?.[q.id] ?? fallbackOrd)[idx]); }
        else if (s1.pick !== null && k === "g" && document.querySelector("#s-guess")) { e.preventDefault(); markGuess(); }
        else if (s1.pick !== null && (e.key === "Enter" || e.key === "ArrowRight")) { e.preventDefault(); sessNext(); }
      } else {
        if (!s1.rev && (e.key === " " || e.key === "Enter")) { e.preventDefault(); reveal(); }
        else if (s1.rev && (k === "1" || e.key === "ArrowLeft")) { e.preventDefault(); rateCard(false); }
        else if (s1.rev && k === "2") { e.preventDefault(); rateCard(true, true); }
        else if (s1.rev && (k === "3" || e.key === "ArrowRight")) { e.preventDefault(); rateCard(true); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const rate = (
    <>
      <div className="rate three">
        <button type="button" className="btn big no" id="s-no" onClick={() => rateCard(false)}><Ic name="x" cls="ic sm" /> Nicht gewusst</button>
        <button type="button" className="btn big unsure" id="s-unsure" onClick={() => rateCard(true, true)}><Ic name="info" cls="ic sm" /> Unsicher</button>
        <button type="button" className="btn big yes" id="s-yes" onClick={() => rateCard(true)}><Ic name="check" cls="ic sm" /> Sicher gewusst</button>
      </div>
      <p className="kbdhelp"><span className="kbd">1</span> nicht gewusst · <span className="kbd">2</span> unsicher · <span className="kbd">3</span> sicher · „Unsicher“ kommt morgen wieder und wird noch nicht grün</p>
    </>
  );
  let body: React.ReactNode, foot: React.ReactNode;
  if (q.type === "mc" && s.pick === null && !s.optOpen) {
    body = <button type="button" className="reveal" id="s-opts" onClick={openOpts}><Ic name="eye" /><b>Antwortmöglichkeiten zeigen</b><span>Überlege zuerst deine eigene Antwort – dann siehst du die Optionen</span></button>;
    foot = <p className="kbdhelp"><span className="kbd">Leertaste</span> Antworten zeigen · <span className="kbd">Esc</span> beenden</p>;
  } else if (q.type === "mc") {
    const ok = s.pick === q.right, picked = s.pick !== null;
    body = (
      <>
        <div className="optlist">{ord.map((i, d) => (
          <button key={i} type="button" data-i={i} className={`opt ${picked ? (i === q.right ? "right" : i === s.pick ? "wrong" : "") : ""}`} disabled={picked} onClick={() => pick(i)}>
            <span className="k">{picked && i === q.right ? <Ic name="check" cls="ic sm" /> : s.pick === i ? <Ic name="x" cls="ic sm" /> : "ABCD"[d]}</span><span>{q.opts[i]}</span>
          </button>
        ))}</div>
        {picked && <Fig q={q} />}
      </>
    );
    const r = s.res[q.id];
    foot = picked && r ? (
      <div className={`feedback ${ok ? "ok" : "bad"}`}>
        <span className="fi"><Ic name={ok ? "check" : "x"} /></span>
        <div><div className="row" style={{ gap: 10 }}><b>{ok ? "Richtig" : "Falsch"}</b><Trans f={r.f} t={r.t} /><span className="nexttxt">{nextTxt(S, q.id)}</span></div><p>{q.why}</p></div>
        {ok && <button type="button" className="btn ghost small" id="s-guess" title="Taste G" onClick={markGuess}>War geraten</button>}
        <button type="button" className="btn primary" id="s-next" onClick={sessNext}>{at + 1 < s.ids.length ? "Weiter" : "Auswertung"} <Ic name="right" cls="ic sm" /></button>
      </div>
    ) : <p className="kbdhelp">Tasten <span className="kbd">1</span>–<span className="kbd">4</span> zum Antworten · <span className="kbd">Enter</span> weiter</p>;
  } else if (lang) {
    const mine = s.code?.[q.id] ?? "", has = !!mine.trim(), cfg = TAP2.sqlDb.cards[q.id] ?? {};
    const setCode = (v: string) => { const s1 = S0().sess; if (s1) S0().setSession({ ...s1, code: { ...(s1.code ?? {}), [q.id]: v } }); };
    body = !s.rev ? (
      <>
        <div className="code-task">
          <div className="ct-head"><Ic name="code" cls="ic sm" /><span>{LANG_N[lang]} – tippe deine Lösung, dann vergleichst du sie mit der Musterlösung</span></div>
          <CodeEditor lang={lang} edit doc={mine} label="Deine Lösung" onChange={setCode} onSubmit={reveal} onRun={lang === "sql" ? () => sqlRun.current?.() : undefined} />
          {lang === "sql" && <SqlPanel id={q.id} getCode={() => S0().sess?.code?.[q.id] ?? ""} runRef={sqlRun} />}
        </div>
        <button type="button" className="reveal" id="s-reveal" style={{ marginTop: 14 }} onClick={reveal}><Ic name="eye" /><b>Mit Musterlösung vergleichen</b><span>{has ? "Erst fertig tippen" : "Oder ohne Tippen direkt aufdecken"} · Strg/Cmd + Enter im Editor</span></button>
      </>
    ) : (
      <>
        <div className={`cmp ${has ? "" : "solo"}`}>
          {has && <div><span className="alab">Deine Lösung</span><CodeEditor key="u" lang={lang} edit={false} doc={mine} label="Deine Lösung (nur lesen)" />{lang === "sql" && <SqlAuto id={q.id} code={mine} verdict />}</div>}
          <div className="sol"><span className="alab">Musterlösung</span><CodeEditor key="s" lang={lang} edit={false} doc={q.type === "card" ? q.a : ""} label="Musterlösung" />{lang === "sql" && <SqlAuto id={q.id} code={cfg.sol ?? ""} verdict={false} />}</div>
        </div>
        <p className="cmp-hint">{has ? "Vergleiche Struktur und Logik, nicht jedes Zeichen: Andere Variablennamen oder eine gleichwertige Lösung zählen in der Prüfung genauso." : "Tipp: Beim nächsten Mal erst selbst tippen, so merkst du dir die Struktur deutlich besser."}</p>
        <Ewh q={q} />
      </>
    );
    foot = s.rev ? rate : <p className="kbdhelp">Im Editor: <span className="kbd">Tab</span> einrücken · <span className="kbd">Strg/Cmd</span> + <span className="kbd">Enter</span> vergleichen · <span className="kbd">Esc</span> außerhalb beendet</p>;
  } else {
    const own = (s.own || "").trim();
    body = s.rev ? (
      <>
        {own && <div className="answer-wrap own"><span className="alab">Deine Antwort</span><div className="answer">{s.own}</div></div>}
        <div className="answer-wrap"><span className="alab">{q.type === "card" && q.note ? "Musterlösung" : "Antwort"}</span><div className={`answer ${looksCode(q) ? "mono" : ""}`}>{q.type === "card" ? q.a : ""}</div></div>
        <Fig q={q} /><Ewh q={q} />
        {own && <p className="cmp-hint">Vergleiche: Sind alle Aspekte aus dem Erwartungshorizont drin? Passt deine Antwort zum Operator?</p>}
      </>
    ) : (
      <>
        <label className="explain" htmlFor="s-own">
          <span className="alab">Deine Antwort – kurz in Stichpunkten</span>
          <textarea id="s-own" rows={3} placeholder="Erst selbst formulieren, dann aufdecken (Strg/Cmd + Enter) …" defaultValue={s.own || ""}
            onChange={(e) => patch({ own: e.target.value })} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); reveal(); } }} />
        </label>
        <button type="button" className="reveal" id="s-reveal" onClick={reveal}><Ic name="eye" /><b>Antwort zeigen</b><span>Mit deiner Antwort vergleichen – Feld leer lassen geht auch</span></button>
      </>
    );
    foot = s.rev ? rate : <p className="kbdhelp"><span className="kbd">Leertaste</span> Antwort zeigen · <span className="kbd">Esc</span> beenden</p>;
  }
  const last = s.last, chip = (gm("chip") as string) || "";
  return (
    <div className={`quiz t-${tcolOf(t.teil)}`} ref={ref}>
      <div className="quiz-top">
        <button type="button" className="iconbtn" id="s-close" aria-label="Runde beenden" onClick={close}><Ic name="x" /></button>
        <div className="prog"><span>{s.title}</span><div className="bar"><i style={{ width: `${(at / s.ids.length) * 100}%` }} /></div></div>
        {/* Serien-Anzeige aus dem Original-Belohnungs-Modul (eigenes, intern escaptes HTML) */}
        {chip && <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: chip }} />}
        <span className="qcount num">{at + 1} / {s.ids.length}</span>
        <a className="iconbtn report" href={reportUrl(q)} target="_blank" rel="noopener" aria-label="Fehler in dieser Frage melden" title="Fehler melden"><Ic name="flag" /></a>
        <button type="button" className={`iconbtn star ${marked ? "marked" : ""}`} aria-pressed={marked} aria-label={marked ? "Markierung entfernen" : "Frage markieren"} title="Markieren" onClick={() => toggleMark(q.id)}><Ic name="star" /></button>
      </div>
      {last && <div className={`lastnote ${last.ok ? "ok" : "bad"}`}><Ic name={last.ok ? "check" : "x"} cls="ic xs" /> Vorherige Frage {last.ok ? "gewusst" : "nicht gewusst"} <Trans f={last.f} t={last.t} />{last.id && <span className="nexttxt">{nextTxt(S, last.id)}</span>}</div>}
      <section className="card qcard">
        <div className="qlab"><span className="stat-chip"><Amp s={sv} />{ST_LBL[sv]}</span><span className="chip">{q.type === "mc" ? "Auswahlfrage" : q.own ? "Eigene Frage" : "Wissensfrage"}</span>{multi && <span className="chip tchip">{mixed ? "Wiederholung · " : ""}{t.n}</span>}</div>
        <Front text={q.q} />
        {body}
      </section>
      {foot}
    </div>
  );
}

function SessEnd({ sess: s, close }: { sess: Session; close: () => void }) {
  const S = useProgress((x) => x.S), startRound = useStartRound(), navigate = useNavigate();
  const done = s.ids.filter((id, i, a) => s.res[id] && a.indexOf(id) === i).map((id) => ({ q: getQ(S, id), r: s.res[id] })).filter((x): x is { q: Question; r: Session["res"][string] } => !!x.q);
  const ok = done.filter((x) => x.r.ok).length, wrong = done.filter((x) => !x.r.ok);
  const c = counts(S, done.map((x) => x.q)), green = done.filter((x) => x.r.t === 2 && x.r.f !== 2).length;
  const again = () => startRound({ list: wrong.map((x) => x.q), title: "Fehler wiederholen", src: s.src.final ? { ...s.src, final: false } : s.src });
  const evE = evById(s.src.ev);
  const next = () => {
    if (evE) { startRound(s.src.final ? learnEvFinal(S, evE) : learnEv(S, evE, s.src.kap)); return; }
    startRound(nextRound(S, s.src));
  };
  // Event: Abschlusstest auswerten (Belohnung vergibt das Belohnungs-Modul) und gemeistertes Kapitel melden – je Runde einmal
  useEffect(() => {
    const cur = S0().sess; if (!evE || !cur) return;
    if (cur.src.final && !cur.evRes) {
      const sure = done.filter((x) => x.r.ok && !x.r.guess).length;
      const r = (gm("evFinal", evE, sure, done.length) as { pass?: boolean; got?: boolean; late?: boolean } | undefined) || { pass: evPassFallback(sure, done.length) };
      patch({ evRes: { sure, n: done.length, pass: !!r.pass, got: !!r.got, late: !!r.late } satisfies EvRes });
    }
    if (cur.src.kap && !cur.evKap) { patch({ evKap: true }); if (kapMastered(S0().S, evE, cur.src.kap)) gm("evKap", evE, cur.src.kap); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const er = s.evRes as EvRes | undefined;
  return (
    <div className="quiz">
      <section className="card endcard">
        <span className="small muted">Runde beendet · {s.title}</span>
        <h2>{ok} von {done.length} gewusst</h2>
        <p className="muted">{green ? `${green} ${green === 1 ? "Frage ist" : "Fragen sind"} neu auf Grün. ` : ""}{wrong.length ? `${wrong.length} ${wrong.length === 1 ? "Frage steht" : "Fragen stehen"} auf Rot und ${wrong.length === 1 ? "kommt" : "kommen"} in der nächsten Runde zuerst.` : "Keine Fehler in dieser Runde."}</p>
        {er && <div className={`ev-res ${er.pass ? "ok" : "bad"}`}><b>Abschlusstest: {er.sure} von {er.n} sicher richtig ({Math.round((er.sure / Math.max(1, er.n)) * 100)} %)</b><span>{er.pass ? (er.got ? "Bestanden! Deine Sonderbelohnung liegt jetzt in der Garderobe." : er.late ? "Bestanden – das Event ist aber vorbei, die Belohnung gibt es nicht mehr." : "Bestanden!") : "Noch nicht bestanden – ab 80 % klappt es. Wiederhole die Fehler und versuche es dann noch einmal."}</span></div>}
        <div><AmpBar c={c} cls="lg" /><Legend c={c} /></div>
        <div className="row">
          {wrong.length > 0 && <button type="button" className="btn primary" onClick={again}><Ic name="again" cls="ic sm" /> Fehler wiederholen ({wrong.length})</button>}
          <button type="button" className={`btn ${wrong.length ? "" : "primary"}`} onClick={next}>Nächste Runde</button>
          <button type="button" className="btn ghost" onClick={close}>Fertig</button>
        </div>
      </section>
      {wrong.length > 0 && (
        <section className="card"><h3>Diese Fragen saßen noch nicht</h3>
          {wrong.map((x) => (
            <div key={x.q.id} className="review bad"><span className="ri"><Ic name="x" /></span><div><b>{qTask(x.q.q)}</b><br />
              <span className={`small ${x.q.type === "mc" ? "" : looksCode(x.q) ? "pre mono" : "pre"}`}>{x.q.type === "mc" ? `Richtig: ${x.q.opts[x.q.right]}${x.q.why ? " · " + x.q.why : ""}` : x.q.a}</span>
            </div></div>
          ))}
        </section>
      )}
    </div>
  );
}
