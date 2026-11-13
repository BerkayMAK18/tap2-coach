/**
 * Bindet eine Ansicht des Original-Belohnungs-Moduls ein (z. B. gm("view", el), gm("rangView", el)).
 * Das Modul schreibt fertiges, intern escaptes HTML in den Container und hängt seine Klick-Handler selbst an.
 * Bei jedem render()/hud() des Moduls (useGamiTick) wird neu gezeichnet. Links mit data-go führen zur passenden Seite.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { gm, useGamiTick } from "@/legacy/gami-env";

const ROUTES: Record<string, string> = { start: "/", lernen: "/lernen", belohnungen: "/belohnungen", rangliste: "/rangliste", einstellungen: "/einstellungen" };

export function LegacyView({ fn }: { fn: "view" | "rangView" }) {
  const ref = useRef<HTMLDivElement>(null);
  const tick = useGamiTick((s) => s.n);
  const navigate = useNavigate();
  useEffect(() => { if (ref.current) gm(fn, ref.current); }, [fn, tick]);
  return (
    <div className="mainui" onClickCapture={(e) => {
      const go = (e.target as HTMLElement).closest<HTMLElement>("[data-go],[data-go2]");
      const to = go && ROUTES[go.dataset.go ?? go.dataset.go2 ?? ""];
      if (to) { e.preventDefault(); e.stopPropagation(); void navigate({ to }); }
    }}>
      <div ref={ref} />
    </div>
  );
}
