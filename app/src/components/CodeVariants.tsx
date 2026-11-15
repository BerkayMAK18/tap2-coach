/**
 * Pseudocode-Beispiel mit Reitern:
 * - „Python“ / „JavaScript“: Code in der Sprache (Wahl gemerkt), darunter der Pseudocode „so schreibst du es in der Prüfung“
 * - „Zeile für Zeile“: jede Pseudocode-Zeile mit kurzer Erklärung
 * - „Ablauf“: Schritt-für-Schritt-Animation (Sortieren, Suchen, Maximum) mit hervorgehobener Pseudocode-Zeile
 * Ohne Fassung bleibt es beim Pseudocode wie bisher. Alles nur als Text (React), kein HTML.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { normCode, variantsFor, type CodeLang } from "@/lib/code-variants";
import { ALGO_NAME, SAMPLE, randomData, simulate, visualFor, type Frame, type Visual } from "@/lib/code-visual";
import { Ic } from "@/ui-main";

const KEY = "tap2coach-codesprache";
const LBL: Record<CodeLang, string> = { python: "Python", javascript: "JavaScript" };
const readLang = (): CodeLang => { try { return localStorage.getItem(KEY) === "javascript" ? "javascript" : "python"; } catch { return "python"; } };
type Tab = CodeLang | "zeilen" | "ablauf";

/** pseudo: der Pseudocode; children: wie er bisher dargestellt wird (z. B. <pre>), sonst ein einfaches <pre> */
export function CodeVariants({ pseudo, children, className }: { pseudo: string; children?: ReactNode; className?: string }) {
  const v = variantsFor(pseudo), vis = visualFor(pseudo), [tab, setTab] = useState<Tab>(readLang);
  const plain = children ?? <pre className={className}>{pseudo}</pre>;
  if (!v) return <>{plain}</>;
  const tabs: [Tab, string][] = [["python", LBL.python], ["javascript", LBL.javascript], ...(v.erklaerung ? [["zeilen", "Zeile für Zeile"] as [Tab, string]] : []), ...(vis ? [["ablauf", "Ablauf"] as [Tab, string]] : [])];
  const pick = (t: Tab) => { setTab(t); if (t === "python" || t === "javascript") { try { localStorage.setItem(KEY, t); } catch { /* privat */ } } };
  return (
    <div className="cv">
      <div className="segs cv-tabs" role="tablist" aria-label="Darstellung des Codes">
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={`seg ${tab === k ? "on" : ""}`} onClick={() => pick(k)}>{k === "ablauf" && <Ic name="play" cls="ic xs" />}{l}</button>)}
      </div>
      {tab === "zeilen" && v.erklaerung ? <Zeilen pseudo={pseudo} erkl={v.erklaerung} />
        : tab === "ablauf" && vis ? <Ablauf pseudo={pseudo} v={vis} />
        : <>
          <pre className="cv-code">{v[tab === "javascript" ? "javascript" : "python"]}</pre>
          <div className="cv-pseudo"><span className="cv-lbl">Pseudocode – so schreibst du es in der Prüfung</span>{plain}</div>
        </>}
    </div>
  );
}

/** Jede Pseudocode-Zeile mit Erklärung */
function Zeilen({ pseudo, erkl }: { pseudo: string; erkl: string[] }) {
  const lines = normCode(pseudo).split("\n");
  return (
    <ol className="cv-lines">
      {lines.map((l, i) => <li key={i}><code>{l || " "}</code><span>{erkl[i] ?? ""}</span></li>)}
    </ol>
  );
}

/** Schritt-für-Schritt-Ablauf mit Balken, Variablen und hervorgehobener Zeile */
function Ablauf({ pseudo, v }: { pseudo: string; v: Visual }) {
  const [data, setData] = useState(() => SAMPLE[v.algo]);
  const frames = useMemo<Frame[]>(() => simulate(v, pseudo, data), [v, pseudo, data]);
  const [i, setI] = useState(0), [play, setPlay] = useState(false);
  const f = frames[Math.min(i, frames.length - 1)], lines = normCode(pseudo).split("\n"), max = Math.max(...f.arr, 1);
  useEffect(() => {
    if (!play) return;
    if (i >= frames.length - 1) { setPlay(false); return; }
    const t = setTimeout(() => setI((x) => x + 1), 1100);
    return () => clearTimeout(t);
  }, [play, i, frames.length]);
  const fresh = () => { setPlay(false); setI(0); setData(randomData(v.algo)); };
  // Klassen mit Präfix cv- (z. B. .cmp gibt es schon in main.css)
  const cls = (k: number) => [
    f.swap?.includes(k) ? "cv-swap" : f.cmp?.includes(k) ? "cv-cmp" : "",
    f.key === k || f.at === k ? "cv-key" : "", f.done?.includes(k) ? "cv-done" : "",
    f.mid === k ? "cv-mid" : "", f.found === k ? "cv-found" : "", f.best === k ? "cv-best" : "",
    f.range && (k < f.range[0] || k > f.range[1]) ? "cv-out" : "",
  ].filter(Boolean).join(" ");
  return (
    <div className="cv-ablauf">
      <div className="row cv-ab-head"><b className="small">{ALGO_NAME[v.algo]}</b>{data.x != null && <span className="chip">gesucht: {data.x}</span>}<span className="spacer" /><span className="tiny muted">Schritt {i + 1} von {frames.length}</span></div>
      <div className="cv-bars" role="img" aria-label={`Feld: ${f.arr.join(", ")}`}>
        {f.arr.map((x, k) => (
          <div key={k} className={`cv-bar ${cls(k)}`}>
            <span className="cv-val">{x}</span>
            <i style={{ height: `${Math.max(8, (x / max) * 100)}%` }} />
            <span className="cv-idx">{k}</span>
          </div>
        ))}
      </div>
      <p className="small cv-step" aria-live="polite">{f.text}</p>
      {Object.keys(f.vars).length > 0 && <div className="row cv-vars">{Object.entries(f.vars).map(([k, x]) => <span key={k} className="chip">{k} = {x}</span>)}</div>}
      <div className="row cv-ctl">
        <button type="button" className="btn small ghost" disabled={i === 0} onClick={() => { setPlay(false); setI(0); }} aria-label="Zum Anfang"><Ic name="again" cls="ic xs" /></button>
        <button type="button" className="btn small" disabled={i === 0} onClick={() => { setPlay(false); setI((x) => Math.max(0, x - 1)); }}><Ic name="left" cls="ic xs" /> Zurück</button>
        <button type="button" className="btn small primary" onClick={() => { if (i >= frames.length - 1) setI(0); setPlay((p) => !p); }}>{play ? "Pause" : <><Ic name="play" cls="ic xs" /> Abspielen</>}</button>
        <button type="button" className="btn small" disabled={i >= frames.length - 1} onClick={() => { setPlay(false); setI((x) => Math.min(frames.length - 1, x + 1)); }}>Weiter <Ic name="right" cls="ic xs" /></button>
        <span className="spacer" />
        <button type="button" className="btn small ghost" onClick={fresh}><Ic name="shuffle" cls="ic xs" /> Neue Zahlen</button>
      </div>
      <ol className="cv-src">{lines.map((l, k) => <li key={k} className={f.lines.includes(k) ? "on" : ""}><code>{l || " "}</code></li>)}</ol>
    </div>
  );
}
