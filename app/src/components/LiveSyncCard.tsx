/** Einstellungen → „Mit der Live-App verbinden“: Schlüssel-Sync wie in der Live-App (siehe store/livesync.ts). */
import { useState } from "react";
import { Link2, RefreshCw, Unlink } from "lucide-react";
import { Button, Card, CardEyebrow, InlineError, Input } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useLiveSync } from "@/store/livesync";

export function LiveSyncCard() {
  const l = useLiveSync();
  const [keyIn, setKeyIn] = useState("");
  if (!supabase) return null;
  return (
    <Card className="space-y-4">
      <CardEyebrow>Mit der Live-App verbinden</CardEyebrow>
      {!l.cfg ? (
        <>
          <p className="text-body-300">Gleicher Lernstand, gleiche XP und derselbe Ranglisten-Platz wie in der Live-App: Gib den Sync-Schlüssel aus der Live-App ein (dort Einstellungen → Geräte-Sync → Schlüssel anzeigen). Vorher wird dein Stand hier zurückgelegt.</p>
          <div className="flex flex-wrap gap-2">
            <Input value={keyIn} onChange={(e) => setKeyIn(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" className="max-w-md font-mono" aria-label="Sync-Schlüssel der Live-App" autoComplete="off" spellCheck={false} />
            <Button variant="ink" onClick={() => void l.connect(keyIn)} loading={l.busy}><Link2 className="h-4 w-4" />Verbinden</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-body-300">Verbunden (Gruppe {l.cfg.grp ?? "…"}).{l.cfg.at ? ` Zuletzt abgeglichen: ${new Date(l.cfg.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}.` : ""} Änderungen werden nach etwa 20 Sekunden übertragen.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ink" onClick={() => void l.syncNow()} loading={l.busy}><RefreshCw className="h-4 w-4" />Jetzt abgleichen</Button>
            <Button variant="ghost" onClick={() => l.disconnect()}><Unlink className="h-4 w-4" />Trennen</Button>
          </div>
        </>
      )}
      {l.msg && <p role="status" className="text-body-200">{l.msg}</p>}
      {l.err && <InlineError>{l.err}</InlineError>}
    </Card>
  );
}
