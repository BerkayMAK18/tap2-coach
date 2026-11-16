/**
 * Fängt Fehler beim Zeichnen ab, damit ein einzelner kaputter Bereich (z. B. ein fehlerhafter Stand aus Sync oder
 * Import) nicht die ganze App leer lässt. Der Lernstand bleibt unangetastet; „Neu laden“ reicht meist.
 * Abweichung von der Live-App (dort gibt es keinen solchen Schutz) – bewusst, siehe docs/PORTIERUNG.md.
 */
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode; resetKey?: string };
type State = { failed: boolean; key?: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError(): Partial<State> { return { failed: true }; }
  /** Beim Wechsel der Seite (resetKey) neu versuchen */
  static getDerivedStateFromProps(p: Props, s: State): Partial<State> | null {
    return p.resetKey !== s.key ? { failed: false, key: p.resetKey } : null;
  }
  componentDidCatch(e: unknown) { console.error("Anzeige-Fehler abgefangen:", e); }
  render() {
    if (!this.state.failed) return this.props.children;
    return this.props.fallback !== undefined ? this.props.fallback : (
      <section className="card" role="alert">
        <h3>Dieser Bereich konnte nicht angezeigt werden</h3>
        <p className="small muted">Dein Lernstand ist nicht betroffen. Lade die Seite neu; wenn es bleibt, melde es bitte über die Patch Notes.</p>
        <button type="button" className="btn small primary" onClick={() => window.location.reload()}>Neu laden</button>
      </section>
    );
  }
}
