/**
 * Gemeinsame Bausteine im Design der Live-App (docs/PORTIERUNG.md). Nur im Grundgerüst ändern.
 * - <Ic name> : Icon wie ic(name) in der Live-App (Pfade aus dem eigenen Katalog, kein Fremd-HTML).
 * - <Ring>    : Fortschrittsring wie ring() in der Live-App.
 * - pctS      : „42 %“
 */
import { TAP2 } from "@/content/catalog";

export const pctS = (x: number) => Math.round(x * 100) + " %";

export function Ic({ name, cls = "ic" }: { name: string; cls?: string }) {
  // Icon-Pfade stammen aus src/content/generated (Export aus der Live-App), nie aus Nutzerdaten
  return <svg className={cls} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TAP2.icons[name] ?? "" }} />;
}

export function Ring({ frac, size, sw, inner, cls }: { frac: number; size: number; sw: number; inner?: React.ReactNode; cls?: string }) {
  const r = (size - sw) / 2, C = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
  return (
    <span className={`ring ${cls ?? ""}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={sw} />
        <circle className="fg" cx={size / 2} cy={size / 2} r={r} strokeWidth={sw} strokeDasharray={C.toFixed(2)} strokeDashoffset={(C * (1 - f)).toFixed(2)} strokeOpacity={f === 0 ? 0 : undefined} />
      </svg>
      <span className="rv">{inner ?? ""}</span>
    </span>
  );
}
