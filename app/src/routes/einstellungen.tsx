/**
 * Einstellungen – 1:1 wie rSettings() der Live-App: Darstellung, App & Offline, Geräte-Sync, Übertragen per Link/QR,
 * Fortschritt (Sicherung im selben Dateiformat inkl. Belohnungen, Zurücksetzen), Hilfe, Datenschutz.
 * Geräte-Sync: vorerst die bisherigen Karten der neuen App (Live-Sync, Konto) – die Sync-Karte der Live-App
 * (Kopplungscode, Schlüssel, Cloud-Kopie löschen) folgt als eigener Schritt (docs/PORTIERUNG.md).
 */
import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { gm } from "@/legacy/gami-env";
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
import { LiveSyncCard } from "@/components/LiveSyncCard";

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
      <LiveSyncCard />
      <AccountCard />
      <TxCard />
      <DataCard />
      <section className="card"><h3>Hilfe</h3><p className="tiny muted">App-Version {BUILD}</p><div className="row" style={{ marginTop: 8 }}><button type="button" className="btn small" data-go2="tutorial"><Ic name="map" cls="ic xs" /> Tutorial öffnen</button><button type="button" className="btn small" data-go2="patchnotes">Patch Notes</button><a className="btn small ghost" href={`https://github.com/${REPO}/issues`} target="_blank" rel="noopener">Gemeldete Fehler ansehen</a></div></section>
      <p className="tiny muted" style={{ textAlign: "center", marginTop: 8 }}><button type="button" className="linkbtn" data-go2="datenschutz">Datenschutz</button></p>
    </>
  );
}

/** „Auf anderes Gerät übertragen“ (txCardHTML der Live-App) */
function TxCard() {
  const { tx, imp, build, receive, apply, cancel } = useTransfer();
  const [msg, setMsg] = useState(""), [inp, setInp] = useState("");
  useEffect(() => setMsg(""), [tx?.at]);
  const recv = imp ? (imp.err ? <div className="sql-msg bad"><Ic name="alert" cls="ic sm" /><div><b>Übertragung nicht möglich</b><p>{imp.err}</p></div></div>
    : imp.done ? <div className="sql-msg ok"><Ic name="check" cls="ic sm" /><div><b>Lernstand übernommen</b><p>{imp.done}</p></div></div>
    : imp.inc ? <div className="tx-in"><b>Lernstand von einem anderen Gerät</b><p className="small muted">Stand vom {fmtDay(imp.inc.at)}: {txSummary(imp.inc)}.</p><div className="row"><button type="button" className="btn primary small" onClick={() => apply("merge")}><Ic name="layers" cls="ic xs" /> Zusammenführen (empfohlen)</button><button type="button" className="btn small" onClick={() => apply("replace")}>Ersetzen</button><button type="button" className="btn small ghost" onClick={cancel}>Abbrechen</button></div><p className="tiny muted">Zusammenführen: Pro Frage gilt der neuere Stand, nichts geht verloren. Ersetzen: Dein Stand auf diesem Gerät wird überschrieben.</p></div> : null) : null;
  const copy = async () => { if (!tx?.link) return; try { await navigator.clipboard.writeText(tx.link); setMsg("Link kopiert."); } catch { prompt("Link kopieren:", tx.link); } };
  const send = !tx ? <button type="button" className="btn small primary" onClick={() => void build()}><Ic name="layers" cls="ic xs" /> QR-Code &amp; Link erstellen</button>
    : tx.busy ? <span className="small muted">Wird erstellt …</span>
    : tx.err ? <p className="small warn-text">{tx.err}</p>
    : (
      <div className="tx-out">
        {tx.qr ? <div className="qr-wrap"><svg className="qr" style={{ width: (tx.qr.n + 8) * tx.qr.k, height: (tx.qr.n + 8) * tx.qr.k }} viewBox={`-4 -4 ${tx.qr.n + 8} ${tx.qr.n + 8}`} role="img" aria-label="QR-Code mit deinem Lernstand" shapeRendering="crispEdges"><rect x={-4} y={-4} width={tx.qr.n + 8} height={tx.qr.n + 8} fill="#fff" /><path d={tx.qr.d} fill="#000" /></svg></div> : <p className="small muted">Für einen QR-Code ist dein Lernstand zu groß – nutze den Link.</p>}
        <div className="tx-act"><p className="small">Mit der Kamera des anderen Geräts scannen oder den Link dorthin schicken.{tx.partial && <> <b>Der QR-Code enthält deinen Lernstand, Markierungen und Aufgabenpunkte. Eigene Fragen, Prüfungsergebnisse und das Fehlerprotokoll überträgt nur der Link.</b></>}</p>
          <div className="row"><button type="button" className="btn small" onClick={() => void copy()}><Ic name="check" cls="ic xs" /> Link kopieren</button>{"share" in navigator && <button type="button" className="btn small" onClick={() => void navigator.share({ title: "TAP2 Coach – mein Lernstand", url: tx.link }).catch(() => {})}>Teilen …</button>}<button type="button" className="btn small ghost" onClick={() => void build()}>Neu erstellen</button></div>
          <p className="tiny muted" id="tx-msg">{msg || `Momentaufnahme von ${tx.at} Uhr.`}</p></div>
      </div>
    );
  return (
    <section className="card tx-card"><h3>Auf anderes Gerät übertragen</h3><p className="small muted" style={{ marginTop: 4 }}>Ohne Konto und ohne Server: Dein Lernstand steckt komplett im Link bzw. QR-Code. Auf dem anderen Gerät öffnen – fertig.</p>
      {recv}<div style={{ marginTop: 12 }}>{send}</div>
      <details className="tx-paste"><summary className="small">Link oder Code hier einfügen</summary><p className="tiny muted">Für die installierte iPhone-App: Sie hat einen eigenen Speicher, der Link öffnet sich aber in Safari. Kopiere ihn deshalb und füge ihn hier in der App ein.</p><div className="row"><input type="text" id="tx-in" placeholder="https://…#import=…" autoComplete="off" spellCheck={false} value={inp} onChange={(e) => setInp(e.target.value)} /><button type="button" className="btn small" onClick={() => { if (inp.trim()) void receive(inp).then(() => window.scrollTo({ top: 0 })); }}>Übernehmen</button></div></details>
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
    const data = JSON.stringify({ app: "tap2coach", exportiert: new Date().toISOString(), data: S, gami: gm("data") || undefined, sync: cfg ? { key: cfg.key } : undefined }, null, 1);
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
        if (isObj(o) && o.gami) gm("merge", o.gami);
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
