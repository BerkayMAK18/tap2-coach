/**
 * Einstellungen → „Mit Konto synchronisieren“ (nur die neue App). Sichtbar, wenn Supabase konfiguriert ist (FEATURES.account).
 * Ein Konto, ein Stand: Mit GitHub anmelden reicht, jedes angemeldete Gerät hat denselben Stand. Kein Schlüssel.
 * Stand ohne Konto übernehmen: Kurzcode (Geräte-Sync → Gerät hinzufügen) oder Sync-Schlüssel eingeben.
 * Bausteine wie die Sync-Karte der Live-App (section.card, .row, .btn small, .tx-paste, Rückfrage inline).
 */
import { useState } from "react";
import { FEATURES } from "@/config";
import { useAccount } from "@/store/account";
import { Ic } from "@/ui-main";

export function AccountCard() {
  const a = useAccount();
  const [code, setCode] = useState("");
  const [askDel, setAskDel] = useState(false);
  if (!FEATURES.account) return null;
  const time = (t: number) => new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const name = (a.user?.user_metadata?.user_name as string | undefined) ?? (a.user?.user_metadata?.preferred_username as string | undefined);

  return (
    <section className="card" id="account-card"><h3>Mit Konto synchronisieren</h3>
      {!a.user ? (
        <>
          <p className="small muted" style={{ marginTop: 4 }}>Melde dich auf jedem Gerät mit demselben GitHub-Konto an – dann hast du überall denselben Stand: Lernstand, Belohnungen und Tutor. Kein Schlüssel, kein Code. Dein bisheriger Stand auf diesem Gerät wird dabei übernommen, nichts geht verloren.</p>
          <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn small primary" onClick={() => void a.signIn()}><Ic name="users" cls="ic xs" /> Mit GitHub anmelden</button></div>
        </>
      ) : (
        <>
          <div className="row" style={{ marginTop: 10 }}>{a.busy ? <span className="small muted">Gleicht ab …</span> : <span className="app-ok"><Ic name="check" cls="ic sm" /> Angemeldet{name ? ` als ${name}` : ""}{a.lastSync ? " · abgeglichen " + time(a.lastSync) : ""}</span>}</div>
          <p className="small muted" style={{ marginTop: 4 }}>Dein Stand liegt in deinem Konto und ist auf allen angemeldeten Geräten gleich. Er gleicht sich automatisch ab.</p>
          <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn small primary" disabled={a.busy} onClick={() => void a.syncNow()}><Ic name="again" cls="ic xs" /> Jetzt abgleichen</button></div>
          <details className="tx-paste"><summary className="small">Stand ohne Konto übernehmen</summary>
            <p className="tiny muted">Du hast auf einem anderen Gerät ohne Konto gelernt (Geräte-Sync, auch in der Live-App)? Dort unter <b>Geräte synchronisieren → Gerät hinzufügen</b> einen Code erzeugen und hier eingeben – oder den Sync-Schlüssel. Der Stand wird mit deinem Konto zusammengeführt.</p>
            <div className="row sync-row"><input type="text" placeholder="Code (z. B. K7P-4QX) oder Schlüssel" aria-label="Code oder Sync-Schlüssel" autoComplete="off" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) void a.importNoAccount(code).then(() => setCode("")); }} /><button type="button" className="btn small" disabled={!code.trim() || a.imp?.busy} onClick={() => void a.importNoAccount(code).then(() => setCode(""))}>Übernehmen</button></div>
            {a.imp?.busy && <p className="tiny muted">Wird übernommen …</p>}
            {a.imp?.msg && <p className="small ok-text">{a.imp.msg}</p>}
            {a.imp?.err && <p className="small warn-text">{a.imp.err}</p>}
          </details>
          <details className="tx-paste"><summary className="small">Konto</summary>
            <div className="row">{askDel ? <><button type="button" className="btn small danger" onClick={() => { void a.deleteCloud(); setAskDel(false); }}>Ja, Kopie im Konto löschen</button><button type="button" className="btn small ghost" onClick={() => setAskDel(false)}>Abbrechen</button></>
              : <><button type="button" className="btn small ghost" onClick={() => setAskDel(true)}>Kopie im Konto löschen</button><button type="button" className="btn small ghost" onClick={() => void a.signOut()}>Abmelden</button></>}</div>
            {askDel && <p className="tiny muted">Der Stand in deinem Konto wird gelöscht. Der Lernstand auf deinen Geräten bleibt erhalten.</p>}
          </details>
        </>
      )}
      {a.err && <p className="small warn-text" style={{ marginTop: 8 }}>{a.err}</p>}
    </section>
  );
}
