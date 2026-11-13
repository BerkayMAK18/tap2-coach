/**
 * Einstellungen → „Konto & Sync“. Nur sichtbar, wenn Supabase konfiguriert ist (FEATURES.account).
 * Zustände: abgemeldet → angemeldet ohne Schlüssel (neu erstellen / vorhandenen eingeben) → verbunden.
 */
import { useState } from "react";
import { Github, KeyRound, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { Button, Card, CardEyebrow, ConfirmDialog, InlineError, Input } from "@/ui";
import { FEATURES } from "@/config";
import { useAccount } from "@/store/account";

export function AccountCard() {
  const a = useAccount();
  const [keyIn, setKeyIn] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [askDel, setAskDel] = useState(false);
  if (!FEATURES.account) return null;

  return (
    <Card className="space-y-4">
      <CardEyebrow>Konto & Sync</CardEyebrow>
      {!a.user ? (
        <>
          <p className="text-body-300">Melde dich mit GitHub an, um deinen Lernstand zu sichern und auf mehreren Geräten zu nutzen. Er wird vorher in deinem Browser verschlüsselt – niemand außer dir kann ihn lesen.</p>
          <Button variant="ink" onClick={() => void a.signIn()}><Github className="h-4 w-4" />Mit GitHub anmelden</Button>
        </>
      ) : !a.cfg ? (
        <>
          <p className="text-body-300">Angemeldet. Für die verschlüsselte Sicherung brauchst du einen Schlüssel, den nur du hast.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ink" onClick={() => void a.createKey()} loading={a.busy}><KeyRound className="h-4 w-4" />Neuen Schlüssel erstellen (erstes Gerät)</Button>
          </div>
          <div className="space-y-2">
            <p className="text-body-200 text-slate">Schon auf einem anderen Gerät verbunden? Dort unter „Schlüssel anzeigen“ ablesen und hier eingeben:</p>
            <div className="flex flex-wrap gap-2">
              <Input value={keyIn} onChange={(e) => setKeyIn(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" className="max-w-md font-mono" aria-label="Sync-Schlüssel" autoComplete="off" spellCheck={false} />
              <Button variant="outline" onClick={() => void a.useKey(keyIn)} loading={a.busy}>Verbinden</Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void a.signOut()}><LogOut className="h-4 w-4" />Abmelden</Button>
        </>
      ) : (
        <>
          <p className="text-body-300">Verbunden. Dein Lernstand wird verschlüsselt gesichert und automatisch abgeglichen.{a.lastSync ? ` Zuletzt: ${new Date(a.lastSync).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}.` : ""}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ink" onClick={() => void a.syncNow()} loading={a.busy}><RefreshCw className="h-4 w-4" />Jetzt synchronisieren</Button>
            <Button variant="outline" onClick={() => setShowKey(!showKey)}><KeyRound className="h-4 w-4" />{showKey ? "Schlüssel verbergen" : "Schlüssel anzeigen"}</Button>
            <Button variant="ghost" onClick={() => setAskDel(true)}><Trash2 className="h-4 w-4" />Cloud-Kopie löschen</Button>
            <Button variant="ghost" onClick={() => void a.signOut()}><LogOut className="h-4 w-4" />Abmelden</Button>
          </div>
          {showKey && (
            <div className="rounded-lg bg-tone-warning-light p-3 text-body-200">
              <p className="font-mono text-body-300 select-all">{a.cfg.key}</p>
              <p className="mt-1">Bewahre ihn sicher auf (z. B. im Passwort-Manager). Ohne Schlüssel ist die Sicherung nicht lesbar – auch nicht für den Betreiber. Gib ihn nur auf deinen eigenen Geräten ein.</p>
            </div>
          )}
        </>
      )}
      {a.err && <InlineError>{a.err}</InlineError>}
      <ConfirmDialog open={askDel} onOpenChange={setAskDel} title="Cloud-Kopie löschen?" description="Die verschlüsselte Sicherung in deinem Konto wird gelöscht. Der Lernstand auf deinen Geräten bleibt erhalten." confirmLabel="Löschen" tone="destructive" onConfirm={() => { void a.deleteCloud(); setAskDel(false); }} />
    </Card>
  );
}
