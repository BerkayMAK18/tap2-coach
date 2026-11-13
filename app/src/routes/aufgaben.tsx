/**
 * Aufgaben – 1:1 wie rUeb() der Live-App:
 * - Liste (/aufgaben): 20 Übungsaufgaben nach Thema gruppiert, Ergebnis-Chip je Aufgabe.
 * - Aufgabe (/aufgaben?u=S1): Start mit Timer (oder ohne Zeitmessung), Aufgabentext, Musterlösung erst nach dem Stopp,
 *   eigene Punkte eintragen, bei Punktverlust Fehlerursache wählen (Fehlerprotokoll).
 * „Musterlösung zeigen“ und „Ohne Zeitmessung“ gelten wie UI.showSol/UI.uFree nur, bis eine andere Aufgabe geöffnet wird.
 */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { TAP2, TP } from "@/content/catalog";
import type { Aufgabe } from "@/content/schema";
import { UE, UEB, UEB_TOPIC, reportUrlUeb, uebGroups } from "@/lib/aufgaben";
import { fmtDay } from "@/lib/dates";
import { dec, tcolOf } from "@/lib/lernen";
import { useProgress } from "@/store/progress";
import { tmState, useTimer } from "@/store/timer";
import { Ic } from "@/ui-main";
import { TimerBox } from "@/components/lernen/bits";
import { useOpenTopic } from "@/components/lernen/ui";
import { CauseChips } from "@/components/aufgaben/CauseChips";
import { UebItem } from "@/components/aufgaben/UebItem";

const search = z.object({ u: z.string().optional().catch(undefined) }); // fehlerhafte Links nie zum Absturz führen lassen
export const Route = createFileRoute("/aufgaben")({ validateSearch: search, component: Aufgaben });

function Aufgaben() {
  const { u } = Route.useSearch();
  if (u && UE[u]) return <UebPage key={u} u={UE[u]} />;
  return <UebList />;
}

/** Aufgabe öffnen (data-u in der Live-App) */
function useOpenUeb() {
  const navigate = useNavigate();
  return (id: string) => { void navigate({ to: "/aufgaben", search: { u: id } }); window.scrollTo({ top: 0 }); };
}

function UebList() {
  const ueb = useProgress((s) => s.S.ueb), open = useOpenUeb();
  const done = UEB.filter((u) => ueb[u.id]).length;
  return (
    <>
      <div className="row" style={{ alignItems: "flex-end" }}><p className="lead" style={{ flex: 1, minWidth: 260 }}>Große Aufgaben im Stil der IHK-Prüfung mit Musterlösung, so wie sie in Planen und Algorithmen drankommen. Löse sie auf Papier, vergleiche mit der Lösung und trage deine Punkte ein. Unter 70 % lohnt sich ein zweiter Versuch.</p><span className="chip">{done} von {UEB.length} bearbeitet</span></div>
      {uebGroups().map(([g, l]) => (
        <div key={g} className="ueb-group"><h3>{g}</h3><div className="ueb-list">{l.map((x) => <UebItem key={x.id} id={x.id} onOpen={open} />)}</div></div>
      ))}
    </>
  );
}

function UebPage({ u }: { u: Aufgabe }) {
  const navigate = useNavigate(), openTopic = useOpenTopic();
  const r = useProgress((s) => s.S.ueb[u.id]), { saveUeb, setUebCause } = useProgress.getState();
  const TM = useTimer((s) => s.TM);
  const [showSol, setShowSol] = useState(false), [uFree, setUFree] = useState(false), [pts, setPts] = useState(r ? String(r.p) : "");
  const tid = UEB_TOPIC[u.id], tkey = "u:" + u.id, ust = tmState(TM, tkey);
  // Nach dem Speichern zeigt das Feld wie in der Live-App den gespeicherten (begrenzten) Wert
  const save = () => { saveUeb(u.id, pts); const n = useProgress.getState().S.ueb[u.id]; if (n) setPts(String(n.p)); };

  return (
    <>
      <button type="button" className="backlink" onClick={() => void navigate({ to: "/aufgaben" })}><Ic name="left" cls="ic sm" /> Alle Aufgaben</button>
      <section className={`card t-${tcolOf(u.teil)}`}>
        <div className="row" style={{ alignItems: "flex-start" }}><span className="pk-num">{u.id}</span><div style={{ flex: 1, minWidth: 200 }}><h2>{u.titel}</h2><div className="row" style={{ marginTop: 6 }}>
          <span className="chip">{u.teil}</span><span className="chip">{u.thema}</span><span className="chip blue">{u.max} P · ca. {u.min} Min.</span>
          {tid && <button type="button" className="linkbtn" onClick={() => openTopic(tid, "theorie")}>Theorie: {TP[tid].n}</button>}
          <a className="linkbtn" href={reportUrlUeb(u)} target="_blank" rel="noopener">Fehler melden</a>
        </div></div></div>
        {ust === "idle" && !uFree ? (
          <div className="tm-start-box"><TimerBox k={tkey} min={u.min} compact={false} label="Aufgabe starten" hint="Die Aufgabe erscheint mit dem Start. Läuft die Zeit ab, zählt der Timer ins Minus weiter." /><button type="button" className="linkbtn" onClick={() => setUFree(true)}>Ohne Zeitmessung öffnen</button></div>
        ) : (
          <>
            <div className="tm-bar">{ust === "idle" ? <span className="small muted">Ohne Zeitmessung geöffnet</span> : <TimerBox k={tkey} min={u.min} compact={false} />}</div>
            {u.schema && <div style={{ marginTop: 16 }}><span className="small muted">Tabellen</span><pre>{TAP2.sqlSchema}</pre></div>}
            <div className="qtext" style={{ marginTop: 16 }}>{u.text}</div>
            <p className="small muted" style={{ marginTop: 12 }}>{ust === "run" ? "Löse die Aufgabe auf Papier wie in der Prüfung. Wenn du fertig bist: Stopp drücken, dann siehst du die Musterlösung." : "Löse die Aufgabe auf Papier wie in der Prüfung, erst dann die Lösung ansehen."}</p>
            {ust !== "run" && <div className="row" style={{ marginTop: 14 }}><button type="button" className={`btn ${showSol ? "" : "primary"}`} onClick={() => setShowSol(!showSol)}>{showSol ? "Lösung ausblenden" : "Musterlösung zeigen"}</button></div>}
          </>
        )}
        {showSol && ust !== "run" && (ust !== "idle" || uFree) && (
          <>
            <pre style={{ marginTop: 14 }}>{u.loesung}</pre>
            <div className="row" style={{ marginTop: 14, alignItems: "flex-end" }}>
              <label className="f" htmlFor="u-pts">Deine Punkte (0–{u.max})<input type="number" id="u-pts" min={0} max={u.max} step={0.5} value={pts} onChange={(e) => setPts(e.target.value)} /></label>
              <button type="button" className="btn primary" onClick={save}>Speichern</button>
              {r && <span className="small muted">Zuletzt {r.p}/{u.max} am {fmtDay(r.at)}</span>}
            </div>
            {r && r.p < u.max && <div className="cause-box"><span className="small muted">Fehlerprotokoll: Warum fehlen {dec(u.max - r.p)} P?</span><CauseChips sel={r.cause} onPick={(c) => setUebCause(u.id, c)} /></div>}
          </>
        )}
      </section>
    </>
  );
}
