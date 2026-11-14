/**
 * Bausteine des Belohnungs-Moduls (Markup wie figure()/tile()/preview() der Live-App).
 * Figuren sind eigene SVG-Zeichnungen aus Code (src/lib/gami/art.ts) – nur dafür innerHTML, Namen und Texte als React-Text.
 */
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { figureInner, previewEquip } from "@/lib/gami/figure";
import { RAR, type Equip, type Item } from "@/lib/gami/items";

/** Figur als <svg> (wie figure(c, eq)) */
export function Fig({ c, eq }: { c: string; eq: Equip }) {
  const key = c + "|" + Object.entries(eq).map(([k, v]) => k + "=" + v).join(",");
  const html = useMemo(() => figureInner(c, eq), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
}
/** Vorschau eines Teils: Symbol (Extras) oder Grundfigur mit diesem Teil */
export const Preview = ({ it }: { it: Item }) => (it.icon ? <div className="gm-icon">{it.icon}</div> : <Fig c={it.char!} eq={previewEquip(it)} />);
/** Kachel (tile(it, extra, cls)) */
export function Tile({ it, extra, cls = "", style }: { it: Item; extra?: ReactNode; cls?: string; style?: CSSProperties }) {
  return <div style={style} className={`gm-tile r-${it.rar} ${cls}`}>{extra}<Preview it={it} /><div className="gm-nm">{it.name}</div><div className="gm-rar">{RAR[it.rar]}</div></div>;
}
/** Fortschrittsbalken (div.bar > i mit Breite) */
export const Bar = ({ w, cls }: { w: number; cls?: string }) => <div className={cls ? "bar " + cls : "bar"}><i style={{ width: w + "%" }} /></div>;
