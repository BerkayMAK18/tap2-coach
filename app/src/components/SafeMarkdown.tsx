/**
 * Minimale Markdown-Darstellung für KI-Antworten: Absätze, Überschriften, Listen, **fett**, *kursiv*, `Code`, Codeblöcke.
 * Erzeugt ausschließlich React-Elemente aus Text – kein HTML, kein dangerouslySetInnerHTML, keine Links/Bilder.
 * Dadurch kann eine (manipulierte) KI-Antwort nichts in die Seite einschleusen.
 */
import type { ReactNode } from "react";

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0], k = `${key}-${i++}`;
    if (t.startsWith("`")) out.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("**")) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function SafeMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const parts = text.split(/```[\w-]*\n?/); // ungerade Indizes = Codeblöcke
  parts.forEach((part, pi) => {
    if (pi % 2 === 1) { blocks.push(<pre key={`c${pi}`}>{part.replace(/\n$/, "")}</pre>); return; }
    let list: { ordered: boolean; items: string[] } | null = null;
    const flush = (k: string) => { if (!list) return; const L = list; list = null; blocks.push(L.ordered ? <ol key={k}>{L.items.map((it, j) => <li key={j}>{inline(it, `${k}${j}`)}</li>)}</ol> : <ul key={k}>{L.items.map((it, j) => <li key={j}>{inline(it, `${k}${j}`)}</li>)}</ul>); };
    part.split("\n").forEach((line, li) => {
      const k = `p${pi}-${li}`, ul = /^\s*[-*•]\s+(.*)$/.exec(line), ol = /^\s*\d+[.)]\s+(.*)$/.exec(line), h = /^#{1,4}\s+(.*)$/.exec(line);
      if (ul || ol) { const ordered = !!ol; if (list && list.ordered !== ordered) flush(k + "f"); (list ??= { ordered, items: [] }).items.push((ul ?? ol)![1]); return; }
      flush(k + "f");
      if (h) blocks.push(<p key={k}><b>{inline(h[1], k)}</b></p>);
      else if (line.trim()) blocks.push(<p key={k}>{inline(line, k)}</p>);
    });
    flush(`p${pi}-end`);
  });
  return <div className="md">{blocks}</div>; // Abstände und Code: theme/app.css
}
