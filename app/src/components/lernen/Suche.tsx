/**
 * Suche über alle Fragen – Overlay wie #srch in der Live-App: öffnen mit der Lupe, „/“ oder Strg/Cmd + K,
 * Esc schließt, Pfeiltasten wandern durch die Treffer, Tab bleibt im Dialog. Treffer: Thema öffnen, an einer Frage
 * starten („Suche: …“-Runde über alle Treffer), alle Treffer lernen, Übungsaufgabe öffnen.
 */
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { TAP2, TOPICS, TP, allQ } from "@/content/catalog";
import { ST_LBL, clip, qTask } from "@/lib/lernen";
import { buildIndex, hl, qSnippet, search, snippet, tooShort } from "@/lib/search";
import { st } from "@/lib/srs";
import { useProgress } from "@/store/progress";
import { Ic } from "@/ui-main";
import { Amp, Segs } from "./bits";
import { useLernenUI, useOpenTopic, useStartRound } from "./ui";

const MAX = 60;
export function Suche() {
  const open = useLernenUI((s) => s.srchOpen);
  return open ? <SearchDialog /> : null;
}

function SearchDialog() {
  const raw = useLernenUI((s) => s.srchQ), S = useProgress((s) => s.S);
  const navigate = useNavigate(), startRound = useStartRound(), openTopic = useOpenTopic();
  const inp = useRef<HTMLInputElement>(null), res = useRef<HTMLDivElement>(null), dlg = useRef<HTMLDivElement>(null);
  const idx = useMemo(() => buildIndex(allQ(useProgress.getState().S), TAP2.ueb, TOPICS, TAP2.pakete), []); // beim Öffnen gebaut (srchIndex())
  const short = tooShort(raw), r = short ? null : search(idx, raw);
  const close = () => {
    useLernenUI.setState({ srchOpen: false });
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-label="Fragen durchsuchen"]')?.focus({ preventScroll: true }));
  };
  const title = () => "Suche: „" + clip(raw.trim(), 30) + "“";
  const hits = r ? r.Q.map((x) => x.q) : [];

  useEffect(() => {
    document.body.style.overflow = "hidden"; inp.current?.focus(); inp.current?.select();
    return () => { document.body.style.overflow = ""; };
  }, []);
  useEffect(() => { if (res.current) res.current.scrollTop = 0; }, [raw]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === "Tab") {
        const f = [...(dlg.current?.querySelectorAll<HTMLElement>("input, button") ?? [])], i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1]?.focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0]?.focus(); }
      }
      // Sonst kein stopPropagation (Pfeiltasten/Enter sollen im Suchfeld ankommen) – die Lernrunde prüft srchOpen selbst
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || (e.key === "Enter" && !e.nativeEvent.isComposing)) {
      const f = res.current?.querySelector<HTMLElement>(".srch-hit");
      if (f) { e.preventDefault(); if (e.key === "Enter") f.click(); else f.focus(); }
    }
  };
  const onResKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const list = [...(res.current?.querySelectorAll<HTMLElement>(".srch-hit") ?? [])], i = list.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    if (e.key === "ArrowDown" && i < list.length - 1) list[i + 1].focus();
    else if (e.key === "ArrowUp") (i > 0 ? list[i - 1] : inp.current)?.focus();
  };
  const startAt = (i: number) => { close(); startRound({ list: hits, title: title(), src: { kind: "search" }, startAt: i }); };

  let body: React.ReactNode;
  if (!r) body = <div className="srch-empty">Mindestens zwei Zeichen eingeben. Mehrere Wörter werden alle gesucht.</div>;
  else if (!r.T.length && !r.Q.length && !r.U.length) body = <div className="srch-empty">Keine Treffer für „{raw.trim()}“. Tipp: Wortanfang oder Synonym probieren.</div>;
  else body = (
    <>
      {r.T.length > 0 && <>
        <h4>Themen <span className="cnt">{r.T.length}</span></h4>
        {r.T.map((x) => <button key={x.t.id} type="button" className="srch-hit" onClick={() => { close(); openTopic(x.t.id, "theorie"); }}><Ic name={x.t.ic ?? ""} cls="ic sm" /><span className="ht"><Segs segs={hl(x.t.n, r.terms)} /></span><span className="chip">{x.t.teil}</span></button>)}
      </>}
      {r.Q.length > 0 && <>
        <h4>Lernfragen <span className="cnt">{r.Q.length}</span><span className="spacer" /><button type="button" className="btn small" onClick={() => startAt(0)}><Ic name="play" cls="ic xs" /> Alle {r.Q.length} lernen</button></h4>
        {r.Q.slice(0, MAX).map((x, i) => {
          const s = st(S, x.q.id), sn = qSnippet(x, r.terms);
          return (
            <button key={x.q.id} type="button" className="srch-hit" onClick={() => startAt(i)}>
              <Amp s={s} title={ST_LBL[s]} /><span className="ht"><Segs segs={hl(qTask(x.q.q), r.terms)} /></span><span className="chip">{TP[x.q.topic]?.n ?? ""}</span>
              {sn && <span className="hs">{sn.label}: <Segs segs={sn.segs} /></span>}
            </button>
          );
        })}
        {r.Q.length > MAX && <div className="srch-more">… und {r.Q.length - MAX} weitere. Suchbegriff verfeinern oder „Alle lernen“ nutzen.</div>}
      </>}
      {r.U.length > 0 && <>
        <h4>Übungsaufgaben <span className="cnt">{r.U.length}</span></h4>
        {r.U.map((x) => (
          // Aufgaben-Bereich ist ein eigenes Modul (noch nicht portiert) – der Treffer führt dorthin
          <button key={x.u.id} type="button" className="srch-hit" onClick={() => { close(); void navigate({ to: "/aufgaben", search: { u: x.u.id } }); window.scrollTo({ top: 0 }); }}>
            <Ic name="pencil" cls="ic sm" /><span className="ht">{x.u.id} · <Segs segs={hl(x.u.titel, r.terms)} /></span><span className="chip">{x.u.thema}</span>
            {!r.terms.some((t) => x.front.includes(t)) && <span className="hs"><Segs segs={snippet(x.u.text + " " + x.u.loesung, r.terms, 50)} /></span>}
          </button>
        ))}
      </>}
    </>
  );

  return (
    <div className="srch-back" id="srch" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="srch" role="dialog" aria-modal="true" aria-label="Fragen durchsuchen" ref={dlg}>
        <div className="srch-top">
          <Ic name="search" />
          <input type="search" id="srch-in" ref={inp} placeholder="Suchen, z. B. LEFT JOIN, Kündigungsfrist, Bubble Sort" autoComplete="off" spellCheck={false} aria-label="Suchbegriff" value={raw} onChange={(e) => useLernenUI.setState({ srchQ: e.target.value })} onKeyDown={onInputKey} />
          <button type="button" className="iconbtn sm" id="srch-x" aria-label="Suche schließen" onClick={close}><Ic name="x" /></button>
        </div>
        <div className="srch-res" id="srch-res" aria-live="polite" ref={res} onKeyDown={onResKey}>{body}</div>
        <div className="srch-foot">Durchsucht Fragen, Antworten, Themen und Übungsaufgaben · <span className="kbd">/</span> öffnen · <span className="kbd">Esc</span> schließen</div>
      </div>
    </div>
  );
}
