/**
 * SQL ausführen in SQL-Karten – Markup wie sqlPanel()/sqlOutHTML()/sqlTable() der Live-App.
 * Ergebnisse werden als React-Elemente gebaut (escaped), sql.js wird erst beim ersten Ausführen geladen.
 */
import { useEffect, useState, type MutableRefObject } from "react";
import { TAP2 } from "@/content/catalog";
import type { SqlCard } from "@/content/schema";
import { runSQL, sqlV, sqlVerdict, type SqlResult, type SqlSet, type SqlStatic, type Verdict } from "@/lib/sql";
import { loadSQL } from "@/lib/sql-load";
import { Ic } from "@/ui-main";

const DB = TAP2.sqlDb, TABLES = DB.tables.map((t) => t[0]);
const sqlCfg = (id: string): SqlCard => DB.cards[id] ?? {};
const run = (SQL: SqlStatic, code: string, cfg: SqlCard) => runSQL(SQL, DB.seed, TABLES, code, cfg);

function SqlTable({ set, title }: { set: SqlSet; title?: string }) {
  const MAXR = 100, n = set.values.length;
  return (
    <div className="sqlres">
      {title && <div className="sqlres-t">{title}</div>}
      <div className="tblwrap"><table>
        <thead><tr>{set.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>{set.values.slice(0, MAXR).map((r, i) => <tr key={i}>{r.map((v, j) => (v === null ? <td key={j} className="null">NULL</td> : <td key={j} className={typeof v === "number" ? "n" : undefined}>{sqlV(v)}</td>))}</tr>)}</tbody>
      </table></div>
      <div className="sqlres-f">{n} {n === 1 ? "Zeile" : "Zeilen"}{n > MAXR ? `, die ersten ${MAXR} angezeigt` : ""}</div>
    </div>
  );
}
const Msg = ({ cls, ic, title, text }: { cls: string; ic: string; title: string; text?: string }) => <div className={`sql-msg ${cls}`}><Ic name={ic} cls="ic sm" /><div><b>{title}</b>{text != null && <p>{text}</p>}</div></div>;

/** sqlOutHTML(): Fehler, Bewertung, Ergebnistabellen, „Ausgeführt“, Prüfabfrage. peek = Titel beim Ansehen einer Tabelle. */
function SqlOut({ r, cfg, verdict, peek }: { r: SqlResult; cfg: SqlCard; verdict?: Verdict | null; peek?: string }) {
  if (r.error) return <Msg cls="bad" ic="alert" title="Fehler" text={r.error} />;
  const sets = r.sets.filter((x) => x.columns.length);
  return (
    <>
      {verdict && (verdict.ok ? <Msg cls="ok" ic="check" title="Ergebnis stimmt mit der Musterlösung überein" text={verdict.why || undefined} /> : <Msg cls="bad" ic="x" title="Ergebnis weicht von der Musterlösung ab" text={verdict.why} />)}
      {sets.length
        ? sets.map((x, i) => <SqlTable key={i} set={x} title={i === 0 && peek ? peek : sets.length > 1 ? `Ergebnis ${i + 1}` : ""} />)
        : <Msg cls="info" ic="check" title="Ausgeführt" text={r.changed ? `${r.changed} ${r.changed === 1 ? "Zeile" : "Zeilen"} eingefügt, geändert oder gelöscht.` : "Keine Ergebniszeilen."} />}
      {r.check && cfg.checkT && r.check.map((x, i) => <SqlTable key={"c" + i} set={x} title={i ? "" : cfg.checkT} />)}
    </>
  );
}

type Out = { k: "none" } | { k: "load" } | { k: "fail" } | { k: "empty" } | { k: "res"; r: SqlResult; cfg: SqlCard; verdict?: Verdict | null; peek?: string };
/** sqlInto(): Ladeanzeige, dann Ergebnis bzw. Hinweis, wenn SQLite nicht geladen werden konnte. */
function OutBox({ out }: { out: Out }) {
  if (out.k === "none") return null;
  if (out.k === "load") return <div className="sql-msg info"><span className="spin" aria-hidden="true" /><div><b>SQLite wird geladen …</b></div></div>;
  if (out.k === "fail") return <Msg cls="bad" ic="alert" title="SQLite konnte nicht geladen werden" text="Internetverbindung prüfen und Seite neu laden." />;
  if (out.k === "empty") return <Msg cls="info" ic="info" title="Erst eine Anweisung eingeben" text="Zum Beispiel SELECT * FROM Kunde;" />;
  return <SqlOut r={out.r} cfg={out.cfg} verdict={out.verdict} peek={out.peek} />;
}
function useSqlInto() {
  const [out, setOut] = useState<Out>({ k: "none" });
  const into = (fn: (SQL: SqlStatic) => Out) => { setOut({ k: "load" }); loadSQL().then((SQL) => setOut(fn(SQL))).catch(() => setOut({ k: "fail" })); };
  return [out, setOut, into] as const;
}

/** Panel unter dem Editor (vor dem Aufdecken): Ausführen, Hinweis, Beispiel-Datenbank, Ausgabe. */
export function SqlPanel({ id, getCode, runRef }: { id: string; getCode: () => string; runRef: MutableRefObject<(() => void) | null> }) {
  const cfg = sqlCfg(id), [out, setOut, into] = useSqlInto();
  const doRun = () => {
    if (cfg.norun) return;
    const code = getCode().trim();
    if (!code) { setOut({ k: "empty" }); return; }
    into((SQL) => { const r = run(SQL, code, cfg); return { k: "res", r, cfg, verdict: sqlVerdict(SQL, DB.seed, TABLES, r, cfg) }; });
  };
  runRef.current = doRun;
  const peek = (t: string) => into((SQL) => ({ k: "res", r: run(SQL, `SELECT * FROM ${t};`, {}), cfg: {}, peek: `Tabelle ${t} (Beispieldaten)` }));
  const hint = cfg.norun || cfg.free || cfg.note;
  return (
    <>
      <div className="sqlbar">{!cfg.norun && <><button type="button" className="btn small primary" onClick={doRun}><Ic name="play" cls="ic xs" /> Ausführen</button><span className="small muted sql-kbd">Shift + Enter im Editor</span></>}</div>
      {hint && <p className="small muted sql-hint"><Ic name="info" cls="ic xs" /> {hint}</p>}
      <details className="sqldb">
        <summary><Ic name="db" cls="ic sm" /> Beispiel-Datenbank <span className="muted">· {DB.tables.length} Tabellen, antippen zeigt die Daten</span></summary>
        <div className="sqldb-l">{DB.tables.map(([t, c]) => <button key={t} type="button" className="sqldb-t" onClick={() => peek(t)}><b>{t}</b><span>{c}</span></button>)}</div>
        <p className="small muted" style={{ margin: "8px 2px 2px" }}>{DB.note}</p>
      </details>
      <div className="sql-out" aria-live="polite"><OutBox out={out} /></div>
    </>
  );
}

/** Nach dem Aufdecken: eigene Lösung (mit Bewertung) bzw. Musterlösung automatisch ausführen. */
export function SqlAuto({ id, code, verdict }: { id: string; code: string; verdict: boolean }) {
  const cfg = sqlCfg(id), [out, , into] = useSqlInto();
  useEffect(() => {
    if (cfg.norun || !code.trim() || (!verdict && !cfg.sol)) return;
    into((SQL) => { const r = run(SQL, code, cfg); return { k: "res", r, cfg, verdict: verdict ? sqlVerdict(SQL, DB.seed, TABLES, r, cfg) : undefined }; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, code]);
  return <div className="sql-out"><OutBox out={out} /></div>;
}
