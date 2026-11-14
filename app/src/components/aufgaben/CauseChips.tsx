/** Auswahl der Fehlerursache (causeChips() der Live-App) – auch für die Real-Klausur in Prüfung. */
import { CAUSES, type Cause } from "@/lib/aufgaben";
import { Ic } from "@/ui-main";

export function CauseChips({ sel, onPick }: { sel?: string | null; onPick: (c: Cause) => void }) {
  return (
    <div className="causes" role="group" aria-label="Ursache">
      {(Object.entries(CAUSES) as [Cause, readonly [string, string]][]).map(([k, [l, i]]) => (
        <button key={k} type="button" className={`chip cause ${sel === k ? "on" : ""}`} aria-pressed={sel === k} onClick={() => onPick(k)}><Ic name={i} cls="ic xs" /> {l}</button>
      ))}
    </div>
  );
}
