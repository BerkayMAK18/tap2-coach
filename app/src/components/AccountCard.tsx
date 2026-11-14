/**
 * Einstellungen → „Konto & Sync“ (nur die neue App). Nur sichtbar, wenn Supabase konfiguriert ist (FEATURES.account).
 * Zustände: abgemeldet → angemeldet ohne Schlüssel (neu erstellen / vorhandenen eingeben) → verbunden.
 * Aufbau und Bausteine wie die Sync-Karte der Live-App (section.card, .row, .btn small, .tx-in, Rückfrage inline).
 */
import { useState } from "react";
import { FEATURES } from "@/config";
import { useAccount } from "@/store/account";
import { Ic } from "@/ui-main";

export function AccountCard() {
  const a = useAccount();
  const [keyIn, setKeyIn] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [askDel, setAskDel] = useState(false);
  if (!FEATURES.account) return null;
  const time = (t: number) => new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <section className="card" id="account-card"><h3>Konto &amp; Sync</h3>
      {!a.user ? (
        <>
          <p className="small muted" style={{ marginTop: 4 }}>Melde dich mit GitHub an, um deinen Lernstand zu sichern und auf mehreren Geräten zu nutzen. Er wird vorher in deinem Browser verschlüsselt – niemand außer dir kann ihn lesen.</p>
          <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn small primary" onClick={() => void a.signIn()}><Ic name="users" cls="ic xs" /> Mit GitHub anmelden</button></div>
        </>
      ) : !a.cfg ? (
        <>
          <p className="small muted" style={{ marginTop: 4 }}>Angemeldet. Für die verschlüsselte Sicherung brauchst du einen Schlüssel, den nur du hast.</p>
          <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn small primary" disabled={a.busy} onClick={() => void a.createKey()}><Ic name="lock" cls="ic xs" /> Neuen Schlüssel erstellen (erstes Gerät)</button></div>
          <details className="tx-paste" open><summary className="small">Schon auf einem anderen Gerät verbunden?</summary>
            <p className="tiny muted">Dort unter „Schlüssel anzeigen“ ablesen und hier eingeben.</p>
            <div className="row sync-row"><input type="text" id="acc-key" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" aria-label="Sync-Schlüssel" autoComplete="off" spellCheck={false} value={keyIn} onChange={(e) => setKeyIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void a.useKey(keyIn); }} /><button type="button" className="btn small" disabled={a.busy} onClick={() => void a.useKey(keyIn)}>Verbinden</button></div>
          </details>
          <div className="row" style={{ marginTop: 8 }}><button type="button" className="btn small ghost" onClick={() => void a.signOut()}>Abmelden</button></div>
        </>
      ) : (
        <>
          <div className="row" style={{ marginTop: 10 }}>{a.busy ? <span className="small muted">Gleicht ab …</span> : <span className="app-ok"><Ic name="check" cls="ic sm" /> Verbunden{a.lastSync ? " · abgeglichen " + time(a.lastSync) : ""}</span>}</div>
          <p className="small muted" style={{ marginTop: 4 }}>Dein Lernstand wird verschlüsselt gesichert und automatisch abgeglichen.</p>
          <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn small primary" disabled={a.busy} onClick={() => void a.syncNow()}><Ic name="again" cls="ic xs" /> Jetzt synchronisieren</button></div>
          <details className="tx-paste"><summary className="small">Schlüssel &amp; Konto</summary>
            <p className="tiny muted">Bewahre den Schlüssel sicher auf (z. B. im Passwort-Manager). Ohne ihn ist die Sicherung nicht lesbar – auch nicht für den Betreiber. Gib ihn nur auf deinen eigenen Geräten ein.</p>
            <div className="row">{showKey ? <><code className="sync-key">{a.cfg.key}</code><button type="button" className="btn small ghost" onClick={() => setShowKey(false)}>Verbergen</button></> : <button type="button" className="btn small ghost" onClick={() => setShowKey(true)}>Schlüssel anzeigen</button>}</div>
            <div className="row" style={{ marginTop: 8 }}>{askDel ? <><button type="button" className="btn small danger" onClick={() => { void a.deleteCloud(); setAskDel(false); }}>Ja, Cloud-Kopie löschen</button><button type="button" className="btn small ghost" onClick={() => setAskDel(false)}>Abbrechen</button></>
              : <><button type="button" className="btn small ghost" onClick={() => setAskDel(true)}>Cloud-Kopie löschen</button><button type="button" className="btn small ghost" onClick={() => void a.signOut()}>Abmelden</button></>}</div>
            {askDel && <p className="tiny muted">Die verschlüsselte Sicherung in deinem Konto wird gelöscht. Der Lernstand auf deinen Geräten bleibt erhalten.</p>}
          </details>
        </>
      )}
      {a.err && <p className="small warn-text" style={{ marginTop: 8 }}>{a.err}</p>}
    </section>
  );
}
