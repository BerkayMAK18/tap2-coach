/**
 * Einstellungen – wie rSettings() der Live-App: Darstellung, App & Offline, Synchronisieren, Fortschritt (Sicherung im
 * selben Dateiformat inkl. Belohnungen, Zurücksetzen), Hilfe, Datenschutz.
 * Synchronisieren – zwei Wege (14.11.2026):
 * - Mit Konto (AccountCard): GitHub-Login reicht, ein Stand pro Konto; Stände ohne Konto per Code übernehmen.
 * - Ohne Konto (SyncCard, 1:1 Live-App): Geräte-Sync per Kurzcode/QR, Ende-zu-Ende-verschlüsselt. Bei angemeldetem
 *   Konto nur sichtbar, solange dieses Gerät noch mit einer Gruppe verbunden ist (zum Trennen).
 * „Auf anderes Gerät übertragen“ (Link/QR ohne Server) ist entfallen; empfangene Links (#import=) zeigt ImportCard.
 */
import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { gm } from "@/store/gami";
import { today, fmtDay } from "@/lib/dates";
import { isObj } from "@/lib/state";
import { REPO } from "@/lib/patchnotes";
import { setTheme, themeMode, type ThemeMode } from "@/lib/theme";
import { txSummary } from "@/lib/transfer";
import { useProgress } from "@/store/progress";
import { usePruefung } from "@/store/pruefung";
import { liveGet, useLiveSync } from "@/store/livesync";
import { installApp, usePwa } from "@/store/pwa";
import { useTransfer } from "@/store/transfer";
import { Ic } from "@/ui-main";
import { AccountCard } from "@/components/AccountCard";
import { SyncCard } from "@/components/SyncCard";
import { supabase } from "@/lib/supabase";
import { FEATURES } from "@/config";
import { useAccount } from "@/store/account";

export const Route = createFileRoute("/einstellungen")({ component: Einstellungen });

const BUILD = import.meta.env.VITE_BUILD || "dev"; // wie BUILD der Live-App: lokal „dev“, beim Veröffentlichen eine Prüfsumme

function Einstellungen() {
  const [tm, setTm] = useState<ThemeMode>(themeMode);
  const pwa = usePwa();
  return (
    <>
      <section className="card">
        <h3>Darstellung</h3>
        <div className="segs" role="group" aria-label="Darstellung" style={{ marginTop: 10 }}>{([["auto", "wie System", "auto"], ["light", "Hell", "sun"], ["dark", "Dunkel", "moon"]] as const).map(([m, l, i]) => <button key={m} type="button" className={`seg ${tm === m ? "on" : ""}`} aria-pressed={tm === m} onClick={() => { setTheme(m); setTm(m); }}><Ic name={i} cls="ic xs" /> {l}</button>)}</div>
      </section>
      <section className="card app-card">
        <h3>App &amp; Offline</h3>
        <p className="small muted">{pwa.standalone ? "Du nutzt den Coach als installierte App." : "Du kannst den Coach wie eine App auf dem Startbildschirm ablegen. Er funktioniert dann auch ohne Internet, z. B. in der Bahn."}</p>
        <div className="row">
          {pwa.offline ? <span className="app-ok"><Ic name="check" cls="ic sm" /> Offline nutzbar</span> : pwa.swFail ? <span className="small muted">Offline-Modus ist in diesem Browser nicht verfügbar.</span> : <span className="small muted">Offline-Modus wird eingerichtet …</span>}
          <span className="spacer" />
          {pwa.prompt && <button type="button" className="btn small primary" onClick={() => void installApp()}><Ic name="down" cls="ic xs" /> App installieren</button>}
        </div>
        {!pwa.standalone && !pwa.prompt && pwa.ios && <p className="small muted" style={{ marginTop: 8 }}>iPhone/iPad: In Safari auf <b>Teilen</b> tippen und <b>Zum Home-Bildschirm</b> wählen.</p>}
        {!pwa.standalone && !pwa.prompt && !pwa.ios && <p className="small muted" style={{ marginTop: 8 }}>Installieren: im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.</p>}
      </section>
      <SyncWays />
      <ImportCard />
      <DataCard />
      <section className="card"><h3>Hilfe</h3><p className="tiny muted">App-Version {BUILD}</p><div className="row" style={{ marginTop: 8 }}><button type="button" className="btn small" data-go2="tutorial"><Ic name="map" cls="ic xs" /> Tutorial öffnen</button><button type="button" className="btn small" data-go2="patchnotes">Patch Notes</button><a className="btn small ghost" href={`https://github.com/${REPO}/issues`} target="_blank" rel="noopener">Gemeldete Fehler ansehen</a></div></section>
      <p className="tiny muted" style={{ textAlign: "center", marginTop: 8 }}><button type="button" className="linkbtn" data-go2="datenschutz">Datenschutz</button></p>
    </>
  );
}

/** Synchronisieren: mit Konto (ein Stand, Login reicht) oder ohne Konto (Geräte-Sync per Code/QR) */
function SyncWays() {
  const user = useAccount((s) => !!s.user), live = useLiveSync((s) => !!s.cfg);
  if (!FEATURES.account) return <SyncCard />;
  return (
    <>
      <p className="small muted tp-ways">Synchronisieren – wähle <b>einen</b> Weg: <b>mit Konto</b> (GitHub-Anmeldung reicht, überall derselbe Stand) oder <b>ohne Konto</b> (Geräte per Code oder QR-Code koppeln, Ende-zu-Ende-verschlüsselt).</p>
      <AccountCard />
      {(!user || live) && <>
        {user && live && <p className="small muted tp-ways">Dieses Gerät ist zusätzlich ohne Konto mit einer Gruppe verbunden. Mit Konto brauchst du das nicht mehr – du kannst es unten trennen (der Stand bleibt).</p>}
        <SyncCard title="Ohne Konto synchronisieren" />
      </>}
    </>
  );
}

/** Empfangener Übertragungs-Link (#import= der Live-App): Zusammenführen oder Ersetzen */
function ImportCard() {
  const { imp, apply, cancel } = useTransfer();
  if (!imp) return null;
  return (
    <section className="card tx-card"><h3>Lernstand von einem anderen Gerät</h3>
      {imp.err ? <div className="sql-msg bad"><Ic name="alert" cls="ic sm" /><div><b>Übertragung nicht möglich</b><p>{imp.err}</p></div></div>
        : imp.done ? <div className="sql-msg ok"><Ic name="check" cls="ic sm" /><div><b>Lernstand übernommen</b><p>{imp.done}</p></div></div>
        : imp.inc ? <div className="tx-in"><p className="small muted">Stand vom {fmtDay(imp.inc.at)}: {txSummary(imp.inc)}.</p><div className="row"><button type="button" className="btn primary small" onClick={() => apply("merge")}><Ic name="layers" cls="ic xs" /> Zusammenführen (empfohlen)</button><button type="button" className="btn small" onClick={() => apply("replace")}>Ersetzen</button><button type="button" className="btn small ghost" onClick={cancel}>Abbrechen</button></div><p className="tiny muted">Zusammenführen: Pro Frage gilt der neuere Stand, nichts geht verloren. Ersetzen: Dein Stand auf diesem Gerät wird überschrieben.</p></div> : null}
    </section>
  );
}

/** „Dein Fortschritt“: Sicherung herunterladen/laden (Format der Live-App inkl. Belohnungen), Zurücksetzen */
function DataCard() {
  const { S, storeOk, replaceAll, resetAll } = useProgress();
  const sync = useLiveSync((s) => !!s.cfg);
  // msg: Rückmeldung wie #d-msg der Live-App – bis die Karte neu gezeichnet wird (Rückfrage), dann wieder der Speicherstand
  const [confirm, setConfirm] = useState(false), [msg, setMsg] = useState("");
  const reset2 = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirm) reset2.current?.scrollIntoView({ block: "center" }); }, [confirm]);
  const exportBackup = () => {
    const cfg = liveGet();
    const data = JSON.stringify({ app: "tap2coach", exportiert: new Date().toISOString(), data: S, gami: gm.data() || undefined, sync: cfg ? { key: cfg.key } : undefined }, null, 1);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = "tap2-fortschritt-" + today() + ".json";
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    setMsg("Sicherung erstellt. Bewahre die Datei gut auf.");
  };
  const importBackup = (f: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        if (f.size > 5 * 1024 * 1024) throw new Error("groß");
        const o = JSON.parse(String(rd.result)), d = isObj(o) && isObj(o.data) ? o.data : o;
        if (!isObj(d) || (!d.q && !d.qstat && !d.runs)) throw new Error("format");
        replaceAll(d); // legt den bisherigen Stand zurück (tap2coach-vor-import)
        if (isObj(o) && o.gami) gm.merge(o.gami);
        // Sync-Schlüssel in der Sicherung: Verbinden anbieten (nur wenn hier noch nicht verbunden), wie SY.offer der Live-App
        if (isObj(o) && isObj(o.sync) && typeof o.sync.key === "string" && !liveGet() && supabase) useLiveSync.getState().setUi({ offer: o.sync.key });
        setConfirm(false); setMsg("Sicherung geladen.");
      } catch { setMsg("Die Datei ist keine gültige Sicherung des Coaches."); }
    };
    rd.readAsText(f);
  };
  const reset = () => {
    if (liveGet()) useLiveSync.getState().disconnect();
    resetAll(); usePruefung.getState().close();
    setConfirm(false); setMsg(""); window.scrollTo({ top: 0 });
  };
  return (
    <section className="card data-card">
      <h3>Dein Fortschritt</h3>
      <p className="small muted">Wird automatisch in diesem Browser gespeichert: Lernstand jeder Frage, Markierungen, eigene Fragen, Aufgabenpunkte und Prüfungsergebnisse. Mit einer Sicherung nimmst du ihn auf ein anderes Gerät oder in einen anderen Browser mit.</p>
      <div className="row">
        <button type="button" className="btn small" onClick={exportBackup}><Ic name="down" cls="ic xs" /> Sicherung herunterladen</button>
        <label className="btn small" htmlFor="d-import"><Ic name="again" cls="ic xs" /> Sicherung laden<input type="file" id="d-import" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }} /></label>
        <span className="spacer" />
        {confirm ? <><button type="button" ref={reset2} className="btn small danger" onClick={reset}>Wirklich alles löschen{sync ? " (nur hier)" : ""}</button><button type="button" className="btn small ghost" onClick={() => { setConfirm(false); setMsg(""); }}>Abbrechen</button></> : <button type="button" className="btn small ghost" onClick={() => { setConfirm(true); setMsg(""); }}>Fortschritt zurücksetzen</button>}
      </div>
      {confirm && sync && <p className="tiny muted">Dieses Gerät wird dabei vom Sync getrennt. Der Stand in der Cloud und auf deinen anderen Geräten bleibt.</p>}
      <p className={`small ${storeOk ? "muted" : "warn-text"}`} id="d-msg">{msg || (storeOk ? `Zuletzt gespeichert: ${Object.keys(S.q).length} Fragen bearbeitet, ${S.runs.length} Prüfungen.` : "Dieser Browser erlaubt gerade kein Speichern, z. B. in einem privaten Fenster. Lade dir zwischendurch eine Sicherung herunter.")}</p>
    </section>
  );
}
