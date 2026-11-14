/**
 * Figur (Tier + Hintergrund + Oberteil + Hals + Kopf + Augen) als SVG – 1:1 wie figure() der Live-App.
 * figureInner liefert den Inhalt des <svg>-Elements (für React: <svg … dangerouslySetInnerHTML>), figure das ganze
 * Element. Nur eigene, feste Zeichnungen aus art.ts; IDs (gm1, gm2 …) laufen wie im Original hoch.
 */
import { ANIMALS, BG, EYE, HAT, HIDE_EYE, NECK, SHIRT } from "./art";
import { IT, baseEquip, type Equip, type Item } from "./items";

let gid = 0;
export function figureInner(c: string, eq: Equip) {
  const A = ANIMALS[c], art = (s: string) => (IT[eq[s]] || { art: "" }).art || "";
  const id = "gm" + (++gid), bgArt = art("bg") || A.base, e = art("eye");
  const [hx, hy, hr, hs] = A.a.hat, [ex, ey, es] = A.a.eye, [nx, ny, ns] = A.a.neck;
  return `${BG[bgArt](id)}${A.body}${SHIRT[art("shirt")] ? SHIRT[art("shirt")](c, id) : ""}<g transform="translate(${nx} ${ny}) scale(${ns}) translate(-260 -310)">${NECK[art("neck")] || ""}</g><g transform="translate(${hx} ${hy}) rotate(${hr}) scale(${hs}) translate(-268 -150)">${HAT[art("hat")] || ""}</g>${HIDE_EYE.has(e) ? "" : A.eye}<g transform="translate(${ex} ${ey}) scale(${es}) translate(-240 -222)">${EYE[e] || ""}</g>`;
}
export const figure = (c: string, eq: Equip) => `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${figureInner(c, eq)}</svg>`;
/** Vorschau eines Teils auf der Grundfigur (bzw. Symbol bei Extras) */
export const previewEquip = (it: Item): Equip => { const eq = baseEquip(it.char!); eq[it.slot] = it.id; return eq; };
