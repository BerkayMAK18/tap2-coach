/**
 * Grundgerüst exakt wie in der Live-App (index.html): nav.side mit Marke und Menü, header.top mit Seitentitel und HUD
 * (Prüfungsreife-Ring, Tage, Figur aus dem Belohnungs-Modul, Suche, Einstellungen), main.content.
 * Klassen und Aufbau 1:1 – das Stylesheet der Live-App (theme/main.css) sorgt für das Aussehen, auch auf dem Handy.
 * Noch nicht portierte Bereiche zeigen eine Platzhalterseite (docs/PORTIERUNG.md).
 */
import { useEffect } from "react";
import { Link, Outlet, createRootRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useRegisterSW } from "virtual:pwa-register/react";
import { allQ } from "@/content/catalog";
import { EXAM_DAY } from "@/config";
import { daysBetween, today } from "@/lib/dates";
import { counts } from "@/lib/srs";
import { gm, setGamiContext, useGamiTick } from "@/legacy/gami-env";
import { Ic, Ring, pctS } from "@/ui-main";
import { NAV_FOOT, NAV_MAIN, VTITLE } from "@/ui-main/nav";
import { useProgress } from "@/store/progress";

export const Route = createRootRoute({ component: Shell, notFoundComponent: NotFound });

/** Ansicht der Live-App ↔ Pfad der neuen App */
export const PATH: Record<string, string> = { start: "/", lernen: "/lernen", aufgaben: "/aufgaben", pruefung: "/pruefung", events: "/events", rangliste: "/rangliste", tipps: "/tipps", patchnotes: "/patchnotes", einstellungen: "/einstellungen", belohnungen: "/belohnungen", datenschutz: "/datenschutz", tutor: "/tutor" };
const viewOf = (path: string) => (path === "/" ? "start" : path.split("/")[1] || "start");

let booted = false;
function Shell() {
  const S = useProgress((s) => s.S), sess = useProgress((s) => s.sess);
  const loc = useLocation(), navigate = useNavigate();
  useGamiTick((t) => t.n);
  const view = viewOf(loc.pathname);
  setGamiContext(view, { sess, run: null });
  useEffect(() => { if (!booted) { booted = true; gm("init"); gm("boot", ""); } }, []);
  useEffect(() => { document.title = `${VTITLE[view] ?? "TAP2 Coach"} · TAP2 Prüfungscoach`; }, [view]);

  const c = counts(S, allQ(S)), left = daysBetween(today(), EXAM_DAY);
  const navView = view === "operatoren" || view === "plan" ? "tipps" : view;
  const focus = loc.pathname.startsWith("/lernen/runde");
  const go = (e: React.MouseEvent) => { // Links mit data-go / data-go2 (HUD, eingebettetes Belohnungs-Modul)
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-go],[data-go2]");
    const to = el && PATH[el.dataset.go ?? el.dataset.go2 ?? ""];
    if (to) { e.preventDefault(); void navigate({ to }); }
  };

  return (
    <div className={`app${focus ? " focus" : ""}`} onClick={go}>
      <nav className="side" aria-label="Hauptnavigation">
        <div className="brand"><img className="brand-mark" src="/icons/raven.svg" alt="" /><div className="brand-t">TAP2 Coach<span>Fachinformatik AE</span></div></div>
        {NAV_MAIN.map((n) => <NavBtn key={n.view} n={n} current={navView === n.view} />)}
        <div className="side-foot">{NAV_FOOT.map((n) => <NavBtn key={n.view} n={n} current={navView === n.view} />)}</div>
      </nav>
      <div className="col">
        <header className="top" id="topbar">
          <div className="top-l"><h1 id="page-title">{VTITLE[view] ?? "TAP2 Coach"}</h1></div>
          <div className="hud" id="hud">
            <button type="button" className="pill" data-go="start" title="Anteil der Fragen auf Grün, gelbe zählen halb"><Ring frac={c.pct} size={22} sw={4} /><span className="lbl">Prüfungsreife</span><b>{pctS(c.pct)}</b></button>
            <span className="pill days"><Ic name="calendar" /><b>{Math.max(0, left)}</b><span className="lbl">{left === 1 ? "Tag" : "Tage"}</span></span>
            {/* Figur/Level aus dem Original-Belohnungs-Modul (eigenes, intern escaptes HTML) */}
            <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: (gm("hudHTML") as string) || "" }} />
            <button type="button" className="iconbtn hb" aria-label="Fragen durchsuchen" title="Suchen" onClick={() => void navigate({ to: "/lernen" })}><Ic name="search" /></button>
            <Link to="/einstellungen" className={`iconbtn hb${view === "einstellungen" ? " on" : ""}`} aria-label="Einstellungen" title="Einstellungen"><Ic name="gear" /></Link>
          </div>
        </header>
        <main className="content"><section className="view"><Outlet /></section></main>
      </div>
      <UpdatePrompt />
    </div>
  );
}

function NavBtn({ n, current }: { n: { view: string; svg: string; label: string }; current: boolean }) {
  return (
    <Link to={PATH[n.view] ?? "/"} className="nav-i" data-view={n.view} aria-current={current ? "page" : "false"}>
      {/* Icon-Pfade aus dem Markup der Live-App (generiert, ui-main/nav.ts) */}
      <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: n.svg }} />
      <span>{n.label}</span>
    </Link>
  );
}

/** Neue Version: nie automatisch neu laden (könnte eine Lernrunde unterbrechen) – wie in der Live-App. */
function UpdatePrompt() {
  const { needRefresh: [need, setNeed], updateServiceWorker } = useRegisterSW();
  if (!need) return null;
  return (
    <div className="toast" role="status">
      <span>Neue Version verfügbar. Dein Lernstand bleibt erhalten.</span>
      <button type="button" className="btn small primary" onClick={() => updateServiceWorker(true)}>Neu laden</button>
      <button type="button" className="btn small ghost" onClick={() => setNeed(false)}>Später</button>
    </div>
  );
}

function NotFound() {
  return <section className="card"><h3>Seite nicht gefunden</h3><p className="small muted"><Link to="/">Zur Übersicht</Link></p></section>;
}
