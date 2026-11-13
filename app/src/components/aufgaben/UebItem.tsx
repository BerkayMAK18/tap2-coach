/** Zeile einer Übungsaufgabe (button.ueb-item der Live-App) – in der Aufgabenliste und auf der Themenseite. */
import { UE, uebChip } from "@/lib/aufgaben";
import { tcolOf } from "@/lib/lernen";
import { useProgress } from "@/store/progress";

export function UebItem({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const u = UE[id], r = useProgress((s) => s.S.ueb[id]);
  if (!u) return null;
  return (
    <button type="button" className={`ueb-item t-${tcolOf(u.teil)}`} onClick={() => onOpen(id)}>
      <span className="id">{u.id}</span>
      <span><span className="t">{u.titel}</span><br /><span className="sub">{u.teil} · {u.max} P · ca. {u.min} Min.</span></span>
      <span className="r">{r ? <span className={`chip ${uebChip(r.p, u.max)}`}><span className="d" />{r.p}/{u.max}</span> : <span className="chip">offen</span>}</span>
    </button>
  );
}
