/**
 * Grundgerüst exakt wie in der Live-App (index.html): nav.side mit Marke und Menü, header.top mit Seitentitel und HUD
 * (Prüfungsreife-Ring, Tage, Figur aus dem Belohnungs-Modul, Suche, Einstellungen), main.content.
 * Klassen und Aufbau 1:1 – das Stylesheet der Live-App (theme/main.css) sorgt für das Aussehen, auch auf dem Handy.
 * Noch nicht portierte Bereiche zeigen eine Platzhalterseite (docs/PORTIERUNG.md).
 * Die Suche über alle Fragen (Lupe, „/“, Strg/Cmd + K) liegt wie in der Live-App über allen Ansichten.
 */
import { useEffect } from "react";
import { Link, Outlet, createRootRoute, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useRegisterSW } from "virtual:pwa-register/react";
import { allQ } from "@/content/catalog";
import { EXAM_DAY } from "@/config";
import { daysBetween, today } from "@/lib/dates";
import { counts } from "@/lib/srs";
import { EVENTS } from "@/content/catalog";
import { evOn } from "@/lib/events";
import { gm, setGamiContext, useGami } from "@/store/gami";
import { HudPill } from "@/components/gami/Hud";
import { GamiLayer } from "@/components/gami/Layer";
import { Ic, Ring, pctS } from "@/ui-main";
import { NAV_FOOT, NAV_MAIN, VTITLE } from "@/ui-main/nav";
import { isPremium } from "@/store/tutor";

/** Menüpunkt Tutor (nicht in der Live-App, daher nicht in der generierten nav.ts) */
const TUTOR_NAV = { view: "tutor", label: "Tutor", svg: '<path d="M2 9.5L12 4.5l10 5-10 5z"/><path d="M6 11.5v4.5c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.5"/><path d="M22 9.5V15"/>' }; // Doktorhut
import { useProgress } from "@/store/progress";
import { useLiveSync } from "@/store/livesync";
import { useAccount } from "@/store/account";
import { usePruefung } from "@/store/pruefung";
import { KEY_TUT } from "@/lib/tipps";
import { Suche } from "@/components/lernen/Suche";
import { openSearch, takeBoot, useSearchHotkey } from "@/components/lernen/ui";

export const Route = createRootRoute({
  // Beim Start eine gespeicherte Lernrunde fortsetzen (wie die Live-App: gespeicherte Runde → Ansicht Lernen)
  beforeLoad: ({ location }) => {
    if (!takeBoot()) return;
    // Übertragungs-Link (…#import=…): Lernstand anzeigen und fragen, wie er übernommen wird (txReceive der Live-App)
    const h = window.location.hash.slice(1);
    if (h.startsWith("import=")) { void import("@/store/transfer").then((m) => m.useTransfer.getState().receive(h)); throw redirect({ to: "/einstellungen", replace: true }); }
    // Kopplungs-Link (…#verbinden=CODE): Code prüfen und „Dieses Gerät verbinden?“ fragen (syncBoot der Live-App)
    if (h.startsWith("verbinden=")) { void useLiveSync.getState().redeem(h.slice(10)); throw redirect({ to: "/einstellungen", replace: true }); }
    const P = useProgress.getState();
    if (P.sess && !location.pathname.startsWith("/lernen/runde")) throw redirect({ to: "/lernen/runde", replace: true });
    // Erster Start (noch nichts beantwortet, Tutorial nie gesehen): Tutorial zeigen – wie die Live-App ohne Adresse (#…)
    let seen = true; try { seen = !!localStorage.getItem(KEY_TUT); } catch { /* privat */ }
    if (location.pathname === "/" && !P.sess && !seen && !Object.keys(P.S.q).length) throw redirect({ to: "/tutorial", replace: true });
  },
  component: Shell, notFoundComponent: NotFound,
});

/** Ansicht der Live-App ↔ Pfad der neuen App */
export const PATH: Record<string, string> = { start: "/", lernen: "/lernen", aufgaben: "/aufgaben", pruefung: "/pruefung", operatoren: "/operatoren", plan: "/plan", tutorial: "/tutorial", events: "/events", rangliste: "/rangliste", tipps: "/tipps", patchnotes: "/patchnotes", einstellungen: "/einstellungen", belohnungen: "/belohnungen", datenschutz: "/datenschutz", tutor: "/tutor" };
const viewOf = (path: string) => (path === "/" ? "start" : path.split("/")[1] || "start");

let booted = false;
// Adresse beim Start (vor der Weiterleitung): Übertragen/Verbinden zeigt keinen Login-Kalender darüber (wie die Live-App)
const BOOT_HASH = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
function Shell() {
  const S = useProgress((s) => s.S), sess = useProgress((s) => s.sess), run = usePruefung((s) => s.run);
  const loc = useLocation(), navigate = useNavigate();
  useGami((t) => t.n);
  const view = viewOf(loc.pathname);
  setGamiContext(view, { sess, run });
  useEffect(() => { if (!booted) { booted = true; gm.boot(BOOT_HASH.startsWith("verbinden=") ? "import=" : BOOT_HASH); } }, []);
  useSearchHotkey();
  useEffect(() => { document.title = `${VTITLE[view] ?? (view === "tutor" ? "Tutor" : "TAP2 Coach")} · TAP2 Prüfungscoach`; }, [view]);

  const c = counts(S, allQ(S)), left = daysBetween(today(), EXAM_DAY);
  // Tutor (Premium): Menüpunkt nur für Admin – Admin-Konto oder auf diesem Gerät freigeschaltet (/tutor?premium=1)
  const admin = useAccount((s) => s.user?.app_metadata?.role === "admin"), tutorOn = admin || isPremium() || view === "tutor";
  const navView = view === "operatoren" || view === "plan" ? "tipps" : view === "lernen" && sess?.src?.ev ? "events" : view; // Event-Runde: Menüpunkt Events
  const focus = loc.pathname.startsWith("/lernen/runde") || (view === "pruefung" && !!run && run.phase === "write"); // Fokus wie die Live-App: Lernrunde, Prüfung beim Schreiben
  // Fokus-Ansicht wie die Live-App an <body> (das Stylesheet blendet mit body.focus die Navigation auf dem Handy aus)
  useEffect(() => { document.body.classList.toggle("focus", focus); return () => document.body.classList.remove("focus"); }, [focus]);
  const go = (e: React.MouseEvent) => { // Links mit data-go / data-go2 (HUD, eingebettetes Belohnungs-Modul)
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-go],[data-go2]");
    const to = el && PATH[el.dataset.go ?? el.dataset.go2 ?? ""];
    if (to) { e.preventDefault(); void navigate({ to }); }
  };

  return (
    <div className="app" onClick={go}>
      <nav className="side" aria-label="Hauptnavigation">
        <div className="brand"><img className="brand-mark" src="/icons/raven.svg" alt="" /><div className="brand-t">TAP2 Coach<span>Fachinformatik AE</span></div></div>
        {NAV_MAIN.map((n) => <NavBtn key={n.view} n={n} current={navView === n.view} />)}
        {tutorOn && <NavBtn n={TUTOR_NAV} current={navView === "tutor"} />}
        <div className="side-foot">{NAV_FOOT.map((n) => <NavBtn key={n.view} n={n} current={navView === n.view} />)}</div>
      </nav>
      <div className="col">
        <header className="top" id="topbar">
          <div className="top-l"><h1 id="page-title">{VTITLE[view] ?? (view === "tutor" ? "Tutor" : "TAP2 Coach")}</h1></div>
          <div className="hud" id="hud">
            <button type="button" className="pill" data-go="start" title="Anteil der Fragen auf Grün, gelbe zählen halb"><Ring frac={c.pct} size={22} sw={4} /><span className="lbl">Prüfungsreife</span><b>{pctS(c.pct)}</b></button>
            <span className="pill days"><Ic name="calendar" /><b>{Math.max(0, left)}</b><span className="lbl">{left === 1 ? "Tag" : "Tage"}</span></span>
            <HudPill view={view} />
            <button type="button" className="iconbtn hb" aria-label="Fragen durchsuchen" title="Suchen (Taste /)" onClick={openSearch}><Ic name="search" /></button>
            <button type="button" className={`iconbtn hb ${view === "einstellungen" ? "on" : ""}`} data-go="einstellungen" aria-label="Einstellungen" title="Einstellungen"><Ic name="gear" /></button>
          </div>
        </header>
        <main className={`content${view === "tutor" ? " wide" : ""}`}><section className="view"><Outlet /></section></main>
        <Foot />
      </div>
      <UpdatePrompt />
      <GamiLayer />
      <Suche />
    </div>
  );
}

/** Fußzeile wie in der Live-App. Abweichung mit Grund: Mit Geräte-Sync (Live-Sync oder Konto) liegt zusätzlich eine
 *  verschlüsselte Kopie auf dem Server – dann nennt der Text das, statt „nur lokal“ zu behaupten. */
function Foot() {
  const live = useLiveSync((s) => !!s.cfg), acc = useAccount((s) => !!s.cfg);
  return <footer className="foot"><span>TAP2 Prüfungscoach · {live || acc ? "Dein Fortschritt wird in diesem Browser gespeichert und verschlüsselt mit deinen Geräten abgeglichen." : "Dein Fortschritt wird lokal in diesem Browser gespeichert."}</span></footer>;
}

// Link setzt bei aktiver Route selbst aria-current="page" – nur bei exakt gleichem Pfad, sonst gilt unsere Markierung
// (z. B. während einer Event-Runde unter /lernen/runde nur „Events“, wie die Live-App)
function NavBtn({ n, current }: { n: { view: string; svg: string; label: string }; current: boolean }) {
  return (
    <Link to={PATH[n.view] ?? "/"} className="nav-i" data-view={n.view} aria-current={current ? "page" : "false"} activeOptions={{ exact: true, includeSearch: false }}>
      {/* Icon-Pfade aus dem Markup der Live-App (generiert, ui-main/nav.ts) */}
      <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: n.svg }} />
      <span>{n.label}</span>
      {/* Roter Punkt bei Events mit noch offener Belohnung (wie die Live-App) */}
      {n.view === "events" && <i className="nav-dot" aria-hidden="true" hidden={!EVENTS.some((e) => evOn(e) && !gm.evInfo(e).got)} />}
    </Link>
  );
}

/** Nach neuer Version suchen wie checkUpdate() der Live-App: alle 10 Minuten und beim Zurückkehren in den Tab (nur online). */
const UPDATE_EVERY = 10 * 60 * 1000;
function watchUpdates(r: ServiceWorkerRegistration) {
  const check = () => { if (navigator.onLine !== false && !r.installing) void r.update().catch(() => { /* offline o. ä.: beim nächsten Mal */ }); };
  setInterval(check, UPDATE_EVERY);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
}

/** Neue Version: nie automatisch neu laden (könnte eine Lernrunde unterbrechen) – Hinweis im Markup der Live-App (#upd). */
function UpdatePrompt() {
  const { needRefresh: [need, setNeed], updateServiceWorker } = useRegisterSW({ onRegisteredSW: (_url, r) => { if (r) watchUpdates(r); } });
  if (!need) return null;
  return (
    <div className="upd" id="upd" role="status" aria-live="polite">
      <span>Neue Version verfügbar. Dein Lernstand bleibt erhalten.</span>
      <button type="button" className="btn small primary" id="upd-go" onClick={() => updateServiceWorker(true)}>Neu laden</button>
      <button type="button" className="iconbtn sm" id="upd-x" aria-label="Hinweis schließen" onClick={() => setNeed(false)}><Ic name="x" /></button>
    </div>
  );
}

function NotFound() {
  return <section className="card"><h3>Seite nicht gefunden</h3><p className="small muted"><Link to="/">Zur Übersicht</Link></p></section>;
}
