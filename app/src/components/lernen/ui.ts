/**
 * Ansichtszustand des Lernen-Bereichs, der wie UI.* in der Live-App Seitenwechsel überdauert (nicht das Neuladen):
 * Filter der Themenliste (tf), Mehrfachauswahl (sel), offener Reiter der Themenseite (ttab), Suche (offen, Suchbegriff).
 * Dazu Helfer zum Starten einer Runde und zum Öffnen eines Themas.
 */
import { useEffect, type RefObject } from "react";
import { create } from "zustand";
import { useNavigate } from "@tanstack/react-router";
import { startTab, type Plan } from "@/lib/lernen";
import { useProgress } from "@/store/progress";
import { examWriting } from "@/store/pruefung";

export type Tf = "alle" | "Teil 1" | "Teil 2" | "SoWi";
export type TTab = "theorie" | "fragen" | "aufgaben";
type UI = { tf: Tf; sel: string[]; ttab: TTab; srchOpen: boolean; srchQ: string };
export const useLernenUI = create<UI>(() => ({ tf: "alle", sel: [], ttab: "theorie", srchOpen: false, srchQ: "" }));

let boot = true;
/** Einmal beim App-Start true: Eine gespeicherte Runde wird dann fortgesetzt statt beendet. */
export const takeBoot = () => { const b = boot; boot = false; return b; };

/** Runde starten und anzeigen (startSess() der Live-App). Leere Liste: nichts passiert. */
export function useStartRound() {
  const navigate = useNavigate();
  return (p: Plan | null) => {
    if (!p || !p.list.length) return;
    useProgress.getState().startSession(p.title, p.list.map((q) => q.id), p.src, p.startAt);
    void navigate({ to: "/lernen/runde" });
    window.scrollTo({ top: 0 });
  };
}
/** Thema öffnen (openTopic() der Live-App): laufende Runde endet, neues Thema → Theorie, sonst Fragen. */
export function useOpenTopic() {
  const navigate = useNavigate();
  return (tid: string, tab?: TTab) => {
    const st = useProgress.getState();
    if (st.sess) st.setSession(null);
    useLernenUI.setState({ ttab: tab ?? (startTab(st.S, tid) as TTab) });
    void navigate({ to: "/lernen", search: { thema: tid } });
    window.scrollTo({ top: 0 });
  };
}

/** Suche öffnen – nicht während eine Prüfung geschrieben wird (wie die Live-App) */
export const openSearch = () => { if (location.pathname.startsWith("/pruefung") && examWriting()) return; useLernenUI.setState({ srchOpen: true }); };

/** Tastenkürzel zum Öffnen (im Grundgerüst eingebunden) */
export function useSearchHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useLernenUI.getState().srchOpen) return;
      const tg = e.target as HTMLElement | null, typing = !!tg && (/INPUT|TEXTAREA|SELECT/.test(tg.tagName) || tg.isContentEditable);
      if ((e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); e.stopPropagation(); openSearch(); }
    };
    window.addEventListener("keydown", onKey, true); // Capture: vor den Tastenkürzeln der Lernrunde
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}

/** Ringe mit Klasse „anim“ von 0 an füllen (animRings() der Live-App), außer bei reduzierter Bewegung.
 *  ref: ein Element der Ansicht (die Ansicht selbst ist section.view im Grundgerüst). */
export function useAnimRings(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  useEffect(() => {
    const el = ref.current?.closest<HTMLElement>(".view") ?? ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.querySelectorAll<SVGCircleElement>(".ring.anim .fg").forEach((c) => {
      // Zielwert merken: Läuft der Effekt doppelt (StrictMode), darf der Startwert nicht als Ziel gelesen werden
      const to = c.dataset.animTo ?? c.getAttribute("stroke-dashoffset") ?? "0", from = c.getAttribute("stroke-dasharray") ?? to;
      c.dataset.animTo = to; c.style.transition = "none"; c.setAttribute("stroke-dashoffset", from);
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = ""; c.setAttribute("stroke-dashoffset", to); delete c.dataset.animTo; }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
