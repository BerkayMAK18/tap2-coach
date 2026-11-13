/**
 * Einstellungen: Sicherung herunterladen/laden – im selben Dateiformat wie die Live-App.
 * Eine Sicherung aus der Live-App lässt sich hier 1:1 laden (und umgekehrt), Belohnungen (gami) werden
 * mitgeschrieben, sobald das Belohnungs-Modul portiert ist. Geladene Dateien laufen durch normalize().
 */
import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Upload } from "lucide-react";
import { Button, Card, CardEyebrow, ConfirmDialog, InlineError } from "@/ui";
import { today } from "@/lib/dates";
import { isObj } from "@/lib/state";
import { useProgress } from "@/store/progress";

export const Route = createFileRoute("/einstellungen")({ component: Einstellungen });

function Einstellungen() {
  const { S, storeOk, replaceAll } = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<unknown>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const exportBackup = () => {
    const data = JSON.stringify({ app: "tap2coach", exportiert: new Date().toISOString(), data: S }, null, 1);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = `tap2-fortschritt-${today()}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    setMsg("Sicherung erstellt. Bewahre die Datei gut auf.");
  };

  const readFile = (f: File) => {
    setErr(null); setMsg(null);
    if (f.size > 5 * 1024 * 1024) { setErr("Die Datei ist zu groß für eine Sicherung."); return; }
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const o = JSON.parse(String(rd.result)), d = isObj(o) && isObj(o.data) ? o.data : o;
        if (!isObj(d) || (!d.q && !d.qstat && !d.runs)) throw new Error("format");
        setPending(d);
      } catch { setErr("Die Datei ist keine gültige Sicherung des Coaches."); }
    };
    rd.readAsText(f);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-heading-300">Einstellungen</h1>
      <Card className="space-y-4">
        <CardEyebrow>Sicherung</CardEyebrow>
        <p className="text-body-300">Dein Lernstand liegt nur in diesem Browser. Sichere ihn regelmäßig – oder lade hier eine Sicherung aus der bisherigen App.</p>
        <p className={storeOk ? "text-body-200 text-slate" : "text-body-200 text-tone-error-dark"}>
          {storeOk ? `Gespeichert: ${Object.keys(S.q).length} Fragen bearbeitet, ${S.runs.length} Prüfungen.` : "Dieser Browser erlaubt gerade kein Speichern (privater Modus?). Lade eine Sicherung herunter, bevor du die Seite schließt."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ink" onClick={exportBackup}><Download className="h-4 w-4" />Sicherung herunterladen</Button>
          <Button variant="outline" onClick={() => file.current?.click()}><Upload className="h-4 w-4" />Sicherung laden</Button>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
        </div>
        {msg && <p role="status" className="text-body-200">{msg}</p>}
        {err && <InlineError>{err}</InlineError>}
      </Card>
      <ConfirmDialog
        open={pending != null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title="Sicherung laden?"
        description="Dein Lernstand in diesem Browser wird durch die Sicherung ersetzt. Der bisherige Stand wird intern zurückgelegt."
        confirmLabel="Laden"
        onConfirm={() => { replaceAll(pending); setPending(null); setMsg("Sicherung geladen."); }}
      />
    </div>
  );
}
