/**
 * Bestätigungsdialog im Design der App statt window.confirm (Browser-Fenster mit Domain-Zeile):
 *   if (await ask({ title: "Sitzung schließen?", text: "…", ok: "Schließen", danger: true })) …
 * <ConfirmHost /> hängt einmal im Layout (__root.tsx). Esc oder Klick daneben = Abbrechen, Enter = Bestätigen,
 * Fokus liegt auf der Bestätigung. Farben und Bausteine aus main.css (Variablen, .btn), eigenes Aussehen in app.css (.cf-*).
 */
import { useEffect, useId, useRef } from "react";
import { Ic } from "./index";
import { done, useConfirm } from "./ask";

export function ConfirmHost() {
  const q = useConfirm((s) => s.q), okRef = useRef<HTMLButtonElement>(null), id = useId();
  useEffect(() => {
    if (!q) return;
    const prev = document.activeElement as HTMLElement | null;
    okRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); done(false); } };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [q]);
  if (!q) return null;
  return (
    <div className="cf-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) done(false); }}>
      <div className={`cf-box${q.danger ? " danger" : ""}`} role="alertdialog" aria-modal="true" aria-labelledby={id + "t"} aria-describedby={q.text ? id + "d" : undefined}>
        <span className="cf-ic" aria-hidden="true"><Ic name={q.icon ?? (q.danger ? "alert" : "info")} cls="ic sm" /></span>
        <div className="cf-body">
          <h3 id={id + "t"}>{q.title}</h3>
          {q.text && <p id={id + "d"} className="small muted">{q.text}</p>}
          <div className="cf-act">
            <button type="button" className="btn small ghost" onClick={() => done(false)}>{q.cancel ?? "Abbrechen"}</button>
            <button type="button" ref={okRef} className={`btn small ${q.danger ? "danger" : "primary"}`} onClick={() => done(true)}>{q.ok ?? "OK"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
