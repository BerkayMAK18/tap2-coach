/**
 * Reiter „Aufgabe“: Aufgabenstellung, Operator, Punkte und Ausgangsmaterial – von der App selbst gerendert.
 * Material kommt als geprüfte Daten (lib/tutor-schema.ts): Tabellen, Code, Geschäftsregeln, Text. Nie HTML aus der KI;
 * Texte nur über React (Tabellenzellen, <pre>) bzw. SafeMarkdown.
 * Nach der Bewertung: Teilpunkte mit Begründung und der Erwartungshorizont des Prüfers.
 */
import type { Aufgabe, Bewertung, Material } from "@/lib/tutor-schema";
import { OPERATOREN } from "@/lib/tutor-schema";
import { SICHER, type Sicher } from "@/lib/tutor-session";
import { Ic } from "@/ui-main";
import { SafeMarkdown } from "../SafeMarkdown";
import { fmt, kernLabel } from "./shared";

const BEREICH = { I: "Anforderungsbereich I – wiedergeben", II: "Anforderungsbereich II – darstellen und erklären", III: "Anforderungsbereich III – urteilen" } as const;
const LANG: Record<string, string> = { pseudocode: "Pseudocode", sql: "SQL", java: "Java", python: "Python", csharp: "C#", javascript: "JavaScript", text: "Text" };

export function MaterialView({ m }: { m: Material }) {
  const head = m.titel ? <div className="sqlres-t">{m.titel}</div> : null;
  switch (m.art) {
    case "tabelle": return (
      <figure className="tp-mat">{head}
        <div className="tblwrap"><table>
          <thead><tr>{m.kopf.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>{m.zeilen.map((z, r) => <tr key={r}>{m.kopf.map((_, c) => <td key={c}>{z[c] ?? ""}</td>)}</tr>)}</tbody>
        </table></div>
      </figure>
    );
    case "code": return <figure className="tp-mat">{head ?? <div className="sqlres-t">{LANG[m.sprache]}</div>}<pre className="code">{m.code}</pre></figure>;
    case "regeln": return <figure className="tp-mat">{head ?? <div className="sqlres-t">Geschäftsregeln</div>}<ol className="tp-rules">{m.punkte.map((p, i) => <li key={i}>{p}</li>)}</ol></figure>;
    case "text": return <figure className="tp-mat">{head}<div className="situ">{m.text}</div></figure>;
  }
}

export function OpChip({ op }: { op: Aufgabe["operator"] }) {
  const b = OPERATOREN[op];
  return <span className="chip violet" title={BEREICH[b]}>{op} · {b}</span>;
}

export function BewertungView({ b, a, xp, sich }: { b: Bewertung; a?: Aufgabe; xp?: number; sich?: Sicher }) {
  const r = b.max > 0 ? b.punkte / b.max : 0, cls = r >= 0.75 ? "ok" : r >= 0.5 ? "yellow" : "bad";
  return (
    <div className={`tp-score ${cls}`}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <b>{fmt(b.punkte)} von {fmt(b.max)} Punkten</b>
        {b.operator_erfuellt === false && <span className="chip red">Operator nicht erfüllt</span>}
        {sich != null && <span className="chip">{SICHER[sich]}</span>}
        <span className="spacer" />
        {xp != null && xp > 0 && <span className="chip blue">+{xp} XP</span>}
      </div>
      <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${Math.round(r * 100)}%`, background: `var(--${cls})` }} /></div>
      {b.teile.length > 0 && (
        <ul className="tp-teile">
          {b.teile.map((t, i) => <li key={i}><span className="tp-pts">{fmt(t.punkte)}/{fmt(t.max)} P.</span><div><b>{t.aspekt}</b><p className="small muted">{t.begruendung}</p></div></li>)}
        </ul>
      )}
      {b.fehlt?.trim() && <p className="small" style={{ margin: "8px 0 0" }}><b>Es fehlt:</b> {b.fehlt}</p>}
      {a && (
        <details className="tx-paste"><summary className="small">Erwartungshorizont des Prüfers</summary>
          <ul className="tp-teile">{a.erwartung.map((e, i) => <li key={i}><span className="tp-pts">{fmt(e.punkte)} P.</span><div>{e.aspekt}</div></li>)}</ul>
        </details>
      )}
    </div>
  );
}

export function AufgabeView({ a, b, xp, sich, onChat }: { a?: Aufgabe; b?: Bewertung; xp?: number; sich?: Sicher; onChat?: () => void }) {
  if (!a) return (
    <div className="tc-side-empty">
      <Ic name="pencil" cls="ic" />
      <p className="small muted">Noch keine Aufgabe. Sobald der Tutor eine stellt, steht sie hier mit Operator, Punkten und Ausgangsmaterial.</p>
    </div>
  );
  return (
    <div className="tp-task">
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        <span className="chip">Aufgabe {a.id}</span>
        <OpChip op={a.operator} />
        <span className="chip blue">{a.punkte} P.</span>
        {b ? <span className="chip ok">bewertet</span> : <span className="chip yellow">offen</span>}
      </div>
      <h3 className="tp-task-t">{a.titel}</h3>
      {a.material.map((m, i) => <MaterialView key={i} m={m} />)}
      <div className="qtext tp-stellung"><SafeMarkdown text={a.stellung} /></div>
      {a.konzepte.length > 0 && <p className="tiny muted" style={{ margin: "10px 0 0" }}>Geprüft: {a.konzepte.map(kernLabel).join(" · ")}</p>}
      {b && <div style={{ marginTop: 14 }}><BewertungView b={b} a={a} xp={xp} sich={sich} /></div>}
      {onChat && !b && <div className="row tutor-mob-only" style={{ marginTop: 12 }}><button type="button" className="btn small primary" onClick={onChat}><Ic name="pencil" cls="ic xs" /> Antworten</button></div>}
    </div>
  );
}
