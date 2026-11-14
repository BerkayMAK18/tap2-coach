/**
 * Events – 1:1 wie rEvents() der Live-App:
 * - Liste (/events): Events mit Belohnung (Vorschau aus dem Belohnungs-Modul), Stand und Restzeit.
 * - Event (/events?ev=lf11a): Kopf mit Sonderbelohnung, Abschlusstest (ab 80 % je Kapitel), Tipps, Kapitel mit
 *   „Kurz erklärt“ (Abbildung aus dem eigenen Katalog) und Lernrunden.
 * HTML wird nur für die Belohnungs-Figur (eigene Zeichnung) und Katalog-Abbildungen eingefügt.
 */
import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { EVENTS, figFor } from "@/content/catalog";
import type { EventCatalog } from "@/content/schema";
import { EV_FINAL, evAllQ, evById, evDate, evKapQ, evOn, evReady, evStatusTxt, evSure, learnEv, learnEvFinal, type EvInfo } from "@/lib/events";
import { counts } from "@/lib/srs";
import { gm, useGami } from "@/store/gami";
import { EvPreview } from "@/components/gami/Hud";
import { useProgress } from "@/store/progress";
import { Ic } from "@/ui-main";
import { AmpBar, Legend } from "@/components/lernen/bits";
import { useStartRound } from "@/components/lernen/ui";

const search = z.object({ ev: z.string().optional().catch(undefined) }); // fehlerhafte Links nie zum Absturz führen lassen
export const Route = createFileRoute("/events")({ validateSearch: search, component: Events });

/** Belohnungs-Vorschau (evRewardHTML): eigene Figur mit Shirt bzw. Titel */
const Reward = ({ e }: { e: EventCatalog }) => <div className="ev-rw"><EvPreview e={e} /></div>;
const info = (e: EventCatalog): EvInfo => gm.evInfo(e);

function Events() {
  const { ev } = Route.useSearch(), e = evById(ev);
  useGami((t) => t.n);
  return e ? <EventPage key={e.id} e={e} /> : <EventList />;
}

function EventList() {
  const S = useProgress((s) => s.S), navigate = useNavigate();
  return (
    <>
      <section className="card"><h2>Events</h2><p className="muted">Lernaktionen für eure Klausuren: eigene Fragenkataloge mit Kurz-Lektionen und eine Sonderbelohnung, die es nur bis zum Klausurtermin gibt. Events zählen nicht zu deiner Prüfungsreife, geben aber ganz normal XP.</p></section>
      {EVENTS.map((x) => {
        const qs = evAllQ(x), c = counts(S, qs), inf = info(x), txt = evStatusTxt(x, inf);
        return (
          <section key={x.id} className={`card ev-card ${evOn(x) || inf.got ? "" : "ev-over"}`}><Reward e={x} /><div className="ev-main"><span className="ev-kick">{x.kurz} · {txt}</span><h3>{x.titel}</h3><p className="small muted">{x.sub} · {x.kapitel.length} Kapitel · {qs.length} Fragen</p><AmpBar c={c} /><p className="small"><b>Belohnung:</b> {x.reward.name}{inf.got ? " ✓" : evOn(x) ? ` · nur bis ${evDate(x.ende)}` : " · nicht mehr erhältlich"}</p>
            <button type="button" className="btn primary small" onClick={() => { void navigate({ to: "/events", search: { ev: x.id } }); window.scrollTo({ top: 0 }); }}>{c.n === c.t ? "Starten" : "Weiterlernen"} <Ic name="right" cls="ic sm" /></button></div></section>
        );
      })}
    </>
  );
}

/** Schmale Bildschirme: Diagramm so weit seitlich scrollen, dass das rot markierte Element sichtbar ist (figFocus()) */
function figFocus(d: HTMLElement) {
  const sc = d.querySelector<HTMLElement>(".qfig-s"); if (!sc || sc.scrollWidth <= sc.clientWidth + 2) return;
  const hs = [...sc.querySelectorAll(".fg-hl, .fg-hlt, .fg-hlb, .fg-hlf")]; if (!hs.length) return;
  const b = sc.getBoundingClientRect(), rs = hs.map((h) => h.getBoundingClientRect()), l = Math.min(...rs.map((r) => r.left)), r = Math.max(...rs.map((r) => r.right));
  sc.scrollLeft = Math.max(0, sc.scrollLeft + (l + r) / 2 - (b.left + b.width / 2));
}

function EventPage({ e }: { e: EventCatalog }) {
  const S = useProgress((s) => s.S), navigate = useNavigate(), startRound = useStartRound(), ref = useRef<HTMLDivElement>(null);
  const qs = evAllQ(e), c = counts(S, qs), inf = info(e), txt = evStatusTxt(e, inf), ready = evReady(S, e), reward = e.reward as EventCatalog["reward"] & { txt?: string };
  useEffect(() => {
    const ds = [...(ref.current?.parentElement?.querySelectorAll<HTMLDetailsElement>(".ev-lern") ?? [])];
    const h = (ev: Event) => { const d = ev.currentTarget as HTMLDetailsElement; if (d.open) figFocus(d); };
    ds.forEach((d) => { if (d.open) figFocus(d); d.addEventListener("toggle", h); });
    return () => ds.forEach((d) => d.removeEventListener("toggle", h));
  }, []);
  return (
    <>
      <button type="button" className="backlink" ref={ref as React.Ref<HTMLButtonElement>} onClick={() => { void navigate({ to: "/events" }); window.scrollTo({ top: 0 }); }}><Ic name="left" cls="ic sm" /> Alle Events</button>
      <section className="card ev-hero"><Reward e={e} /><div className="ev-main"><span className="ev-kick">{e.kurz} · {txt}</span><h2>{e.titel}</h2><p className="muted">{e.sub}</p><p className="small">{e.info}</p>
        <div className="ev-rwbox"><b>Sonderbelohnung: {e.reward.name}</b><span className="small">{reward.txt} {inf.got ? "Schon erhalten." : evOn(e) ? `Nur bis ${evDate(e.ende)}: Abschlusstest mit mindestens 80 % bestehen. Dazu +300 🪶, +2 🎟️ und +200 XP.` : "Das Event ist vorbei, die Belohnung gibt es nicht mehr. Lernen kannst du weiterhin."}</span></div>
        <AmpBar c={c} cls="lg" /><Legend c={c} /></div></section>
      <section className={`card ev-final ${ready ? "" : "locked"}`}><div className="row" style={{ justifyContent: "space-between" }}><h3><Ic name="flag" cls="ic sm" /> Abschlusstest</h3>{inf.done ? <span className="chip">✓ bestanden</span> : null}</div>
        <p className="small muted">{EV_FINAL} Auswahlfragen aus allen Kapiteln. Bestanden ab 80 % sicher richtig – „War geraten“ zählt nicht.{inf.best ? ` Bestes Ergebnis bisher: ${Math.round(inf.best * 100)} %.` : ""}</p>
        {!ready && <p className="small">Schaltet frei, sobald in jedem Kapitel mindestens 80 % der Fragen gelb oder grün sind.</p>}
        <div className="row"><button type="button" className={`btn ${ready ? "primary" : ""}`} disabled={!ready} onClick={() => startRound(learnEvFinal(S, e))}>{inf.done ? "Noch einmal schreiben" : "Abschlusstest starten"}</button><button type="button" className="btn ghost" onClick={() => startRound(learnEv(S, e))}>Alle Kapitel gemischt üben</button></div></section>
      <section className="card ev-tipcard"><h3><Ic name="bulb" cls="ic sm" /> So holst du die Punkte</h3><ul className="ev-tips">{(e.tipps ?? []).map((t, i) => <li key={i}>{t}</li>)}</ul></section>
      {e.kapitel.map((k, i) => {
        const l = evKapQ(e, k), kc = counts(S, l), ok = evSure(S, l), need = Math.ceil(l.length * 0.8), f = k.fig ? figFor(k.fig) : undefined;
        return (
          <section key={k.id} className="card ev-kap"><div className="ev-kh"><span className="ev-kn">{i + 1}</span><div><h3>{k.titel}</h3><span className="small muted">{l.length} Fragen · {ok} gelb oder grün{ok >= need ? " · ✓ bereit für den Abschlusstest" : ` · noch ${need - ok} bis 80 %`}</span></div></div><AmpBar c={kc} />
            <details className="ev-lern" open={kc.n === kc.t}><summary><Ic name="eye" cls="ic sm" /> Kurz erklärt</summary><dl>{k.lern.map(([hd, t], j) => <Lern key={j} hd={hd} t={t} />)}</dl>
              {f && <figure className="qfig"><div className="qfig-h">Im Diagramm</div><div className="qfig-s" dangerouslySetInnerHTML={{ __html: f.svg }} /><figcaption>{f.caption}</figcaption></figure>}</details>
            <div className="row"><button type="button" className="btn primary small" onClick={() => startRound(learnEv(S, e, k.id))}>{kc.n === kc.t ? "Kapitel starten" : kc.open ? `Lernen · ${kc.open} offen` : "Wiederholen"}</button></div></section>
        );
      })}
    </>
  );
}
const Lern = ({ hd, t }: { hd: string; t: string }) => <><dt>{hd}</dt><dd>{t}</dd></>;
