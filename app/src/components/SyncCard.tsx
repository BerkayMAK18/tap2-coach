/**
 * „Geräte synchronisieren“ – 1:1 wie syncCardHTML()/bindSync() der Live-App: Sync einschalten, Gerät per Kurzcode/QR
 * hinzufügen, Code oder Schlüssel eingeben (mit Rückfrage), Schlüssel anzeigen, trennen, Cloud-Kopie löschen.
 * Lokal ohne Server-Zugang: Testzugang (nur localhost). Abgleich und Format: store/livesync.ts.
 */
import { useState } from "react";
import { codeFmt } from "@/lib/pair";
import { isLocalHost, saveDevConf, supabase } from "@/lib/supabase";
import { useLiveSync } from "@/store/livesync";
import { useProgress } from "@/store/progress";
import { qrPath } from "@/store/transfer";
import { Ic } from "@/ui-main";

const syncTime = (t: number) => new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

export function SyncCard() {
  const L = useLiveSync(), nQ = useProgress((s) => Object.keys(s.S.q).length);
  const [inp, setInp] = useState(""), [url, setUrl] = useState(""), [anon, setAnon] = useState("");
  if (!supabase && !isLocalHost) return null;
  const cfg = L.cfg;
  const go = () => { if (inp.trim()) void L.redeem(inp); };

  const dev = !supabase && (
    <div className="tx-in"><b>Testzugang (nur lokal sichtbar)</b><p className="tiny muted">Supabase-Projekt-URL und anon/publishable key. Wird nur in diesem Browser gespeichert.</p>
      <div className="row sync-row"><input type="text" id="sy-url" placeholder="https://xxxx.supabase.co" autoComplete="off" spellCheck={false} value={url} onChange={(e) => setUrl(e.target.value)} /><input type="text" id="sy-anon" placeholder="anon / publishable key" autoComplete="off" spellCheck={false} value={anon} onChange={(e) => setAnon(e.target.value)} /><button type="button" className="btn small" id="sy-dev" onClick={() => { if (saveDevConf(url, anon)) location.reload(); }}>Speichern</button></div></div>
  );
  const ask = L.ask && (
    <div className="tx-in"><b>Dieses Gerät verbinden?</b><p className="small warn-text">Nur mit Codes oder Links von deinen eigenen Geräten verbinden. Wer den Code erzeugt hat, kann deinen Lernstand sehen.{cfg ? " Deine bisherige Verbindung wird dabei ersetzt." : ""}</p><p className="small muted">Dein Lernstand hier ({nQ} Fragen bearbeitet) wird mit dem Stand in der Cloud zusammengeführt. Es geht nichts verloren – pro Frage gilt die neuere Antwort.{cfg ? " Dieses Gerät ist schon mit einem anderen Sync verbunden; auch dieser Stand bleibt erhalten." : ""}</p>
      <div className="row"><button type="button" className="btn primary small" id="sy-yes" onClick={() => void L.start(L.ask!.key)}><Ic name="check" cls="ic xs" /> Verbinden</button><button type="button" className="btn small ghost" id="sy-no" onClick={() => L.setUi({ ask: null })}>Abbrechen</button></div></div>
  );
  const offer = !cfg && !L.ask && L.offer && (
    <div className="tx-in"><b>In der Sicherung steckt ein Sync-Schlüssel</b><p className="small muted">Nur verbinden, wenn die Sicherung von dir selbst stammt.</p><div className="row"><button type="button" className="btn primary small" id="sy-offer" onClick={() => L.setUi({ ask: { key: L.offer! }, offer: null })}>Damit verbinden</button><button type="button" className="btn small ghost" id="sy-offer-no" onClick={() => L.setUi({ offer: null })}>Nein danke</button></div></div>
  );
  const msg = L.msg && <div className="sql-msg ok"><Ic name="check" cls="ic sm" /><div><p>{L.msg}</p></div></div>;
  const enter = (
    <details className="tx-paste" open={!!L.inErr || !cfg}><summary className="small">{cfg ? "Mit einem anderen Code verbinden" : "Code vom anderen Gerät eingeben"}</summary>
      <div className="row sync-row"><input type="text" id="sy-in" placeholder="z. B. K7P-4QX" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={48} value={inp} onChange={(e) => setInp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }} /><button type="button" className="btn small" id="sy-go" onClick={go}>Verbinden</button></div>
      {L.inErr && <p className={`tiny ${/geprüft/.test(L.inErr) ? "muted" : "warn-text"}`} id="sy-inerr">{L.inErr}</p>}
      <p className="tiny muted">Installierte iPhone-App: Den Code hier in der App eintippen – der QR-Code öffnet Safari, und die App hat einen eigenen Speicher.</p></details>
  );

  let body: React.ReactNode = null;
  if (supabase && !cfg) body = (
    <><p className="small muted" style={{ marginTop: 4 }}>Lerne am Laptop und am Handy mit demselben Stand – ohne Konto. Einmal verbinden, danach gleicht sich alles automatisch ab.</p><p className="tiny muted">Ist schon ein anderes Gerät verbunden? Dann hier nicht neu einschalten, sondern dort „Gerät hinzufügen“ tippen und unten den Code eingeben.</p>
      {msg}{ask}{offer}<div className="row" style={{ marginTop: 12 }}><button type="button" className="btn small primary" id="sy-on" disabled={L.busy} onClick={() => void L.turnOn()}><Ic name="layers" cls="ic xs" /> Sync einschalten</button></div>{enter}</>
  );
  else if (supabase && cfg) {
    const st = L.busy ? <span className="small muted" id="sy-st">Gleicht ab …</span> : L.err ? <span className="small warn-text" id="sy-st">{L.err}</span> : <span className="app-ok" id="sy-st"><Ic name="check" cls="ic sm" /> Verbunden{cfg.grp ? " · Gruppe " + cfg.grp : ""}{cfg.at ? " · abgeglichen " + syncTime(cfg.at) : ""}</span>;
    const p = L.pair;
    let qr: ReturnType<typeof qrPath> | null = null;
    if (p?.code) { try { qr = qrPath(location.origin + "/#verbinden=" + p.code); } catch { qr = null; } }
    const pair = !p ? null : p.busy ? <p className="small muted">Code wird erstellt …</p> : p.err ? <p className="small warn-text">{p.err}</p>
      : (p.until ?? 0) < Date.now() ? <p className="small muted">Der Code ist abgelaufen.</p>
      : (
        <div className="tx-out" style={{ marginTop: 12 }}>
          {qr && <div className="qr-wrap"><svg className="qr" style={{ width: (qr.n + 8) * qr.k, height: (qr.n + 8) * qr.k }} viewBox={`-4 -4 ${qr.n + 8} ${qr.n + 8}`} role="img" aria-label="QR-Code mit deinem Lernstand" shapeRendering="crispEdges"><rect x={-4} y={-4} width={qr.n + 8} height={qr.n + 8} fill="#fff" /><path d={qr.d} fill="#000" /></svg></div>}
          <div className="tx-act"><span className="small muted">Code für das andere Gerät</span><b className="sync-code">{codeFmt(p.code!)}</b><p className="small">Auf dem anderen Gerät: <b>Einstellungen → Geräte synchronisieren → Code eingeben</b>, oder den QR-Code mit der Kamera scannen.</p><p className="tiny muted">Gültig bis {syncTime(p.until!)} Uhr. Der Code dient nur zum Verbinden und ist jedes Mal neu – dein Sync-Schlüssel und die Gruppe{cfg.grp ? " " + cfg.grp : ""} bleiben gleich.</p></div>
        </div>
      );
    const copyKey = async () => { try { await navigator.clipboard.writeText(cfg.key); } catch { prompt("Schlüssel kopieren:", cfg.key); } };
    body = (
      <><div className="row" style={{ marginTop: 10 }}>{st}</div>{msg}{ask}
        <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn small primary" id="sy-pair" onClick={() => void L.pairNew()}><Ic name="layers" cls="ic xs" /> Gerät hinzufügen</button><button type="button" className="btn small" id="sy-now" disabled={L.busy} onClick={() => void L.syncNow()}><Ic name="again" cls="ic xs" /> Jetzt abgleichen</button></div>{pair}
        <details className="tx-paste"><summary className="small">Schlüssel &amp; Einstellungen</summary>
          <p className="tiny muted">Dein Sync-Schlüssel ist wie ein Passwort: Wer ihn hat, sieht deinen Lernstand. Er steckt auch in deiner Sicherungsdatei.</p>
          <div className="row">{L.showKey ? <><code className="sync-key">{cfg.key}</code><button type="button" className="btn small ghost" id="sy-copy" onClick={() => void copyKey()}>Kopieren</button></> : <button type="button" className="btn small ghost" id="sy-show" onClick={() => L.setUi({ showKey: true })}>Schlüssel anzeigen</button>}</div>
          <div className="row" style={{ marginTop: 8 }}>{L.confirm === "off" ? <><button type="button" className="btn small danger" id="sy-off2" onClick={L.disconnect}>Ja, trennen</button><button type="button" className="btn small ghost" id="sy-cancel" onClick={() => L.setUi({ confirm: null })}>Abbrechen</button></>
            : L.confirm === "del" ? <><button type="button" className="btn small danger" id="sy-del2" onClick={() => void L.delCloud()}>Ja, Cloud-Kopie löschen</button><button type="button" className="btn small ghost" id="sy-cancel" onClick={() => L.setUi({ confirm: null })}>Abbrechen</button></>
            : <><button type="button" className="btn small ghost" id="sy-off" onClick={() => L.setUi({ confirm: "off" })}>Dieses Gerät trennen</button><button type="button" className="btn small ghost" id="sy-del" onClick={() => L.setUi({ confirm: "del" })}>Kopie in der Cloud löschen</button></>}</div>
          {L.confirm === "off" ? <p className="tiny muted">Dein Lernstand hier bleibt. Dieses Gerät gleicht nur nicht mehr ab.</p> : L.confirm === "del" ? <p className="tiny muted">Löscht den Stand und die Tagessicherungen auf dem Server. Alle Geräte behalten ihren Stand und werden getrennt.</p> : null}
          {enter}
        </details></>
    );
  }
  return (
    <section className="card" id="sync-card"><h3>Geräte synchronisieren</h3>{dev}{body}
      {supabase && <p className="tiny muted" style={{ marginTop: 10 }}>Datenschutz: Dein Lernstand wird im Browser verschlüsselt und so auf einem Server (Supabase) abgelegt. Ohne deinen Schlüssel kann ihn niemand lesen – auch nicht der Betreiber. Kein Name, keine E-Mail. Der Stand auf deinem Gerät bleibt immer erhalten.</p>}
    </section>
  );
}
