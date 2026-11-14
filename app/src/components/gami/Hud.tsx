/**
 * Kleine Anzeigen des Belohnungs-Moduls an anderen Stellen der App (Markup wie in der Live-App):
 * - HudPill: Figur + Level in der Kopfzeile, roter Punkt bei abholbarem Bonus/Quest/Truhe (hudHTML)
 * - ComboChip: Serie in der Lernrunde (chip)
 * - EvPreview: Belohnungs-Vorschau eines Events (evPreview)
 */
import { useEffect } from "react";
import type { EventCatalog } from "@/content/schema";
import { evEq } from "@/lib/gami/core";
import { gami, gm, lbMarkAway, useGami } from "@/store/gami";
import { Fig } from "./bits";

export function HudPill({ view }: { view: string }) {
  useGami((s) => s.n);
  useEffect(() => { if (view !== "rangliste") lbMarkAway(); });
  const G = gami(), dot = gm.claimable();
  return <button type="button" className="pill gm-pill" data-go="belohnungen" title={`Belohnungen: Level ${G.level}`} aria-label={`Belohnungen, Level ${G.level}`}><span className="gm-hava"><Fig c={G.char} eq={G.equip[G.char]} /></span><b>{G.level}</b>{dot ? <i className="gm-dot" aria-hidden="true" /> : null}</button>;
}

export function ComboChip() {
  useGami((s) => s.n);
  const t = gm.chip();
  return t ? <span className="gm-combo" title="Serie richtiger Antworten">{t}</span> : null;
}

export function EvPreview({ e }: { e: EventCatalog }) {
  useGami((s) => s.n);
  const G = gami();
  return e.reward.kind === "shirt" ? <div className="ev-fig"><Fig c={G.char} eq={evEq(G, e)} /></div> : <div className="ev-tt">🏷️<b>{`«${e.reward.name}»`}</b></div>;
}
