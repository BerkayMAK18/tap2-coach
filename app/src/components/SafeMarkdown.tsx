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
    if (t.startsWith("`")) out.push(<code key={k} className="rounded bg-muted px-1 font-mono text-[0.92em]">{t.slice(1, -1)}</code>);
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
    if (pi % 2 === 1) { blocks.push(<pre key={`c${pi}`} className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-body-200">{part.replace(/\n$/, "")}</pre>); return; }
    let list: { ordered: boolean; items: string[] } | null = null;
    const flush = (k: string) => { if (!list) return; const L = list; list = null; blocks.push(L.ordered ? <ol key={k} className="list-decimal space-y-1 pl-5">{L.items.map((it, j) => <li key={j}>{inline(it, `${k}${j}`)}</li>)}</ol> : <ul key={k} className="list-disc space-y-1 pl-5">{L.items.map((it, j) => <li key={j}>{inline(it, `${k}${j}`)}</li>)}</ul>); };
    part.split("\n").forEach((line, li) => {
      const k = `p${pi}-${li}`, ul = /^\s*[-*•]\s+(.*)$/.exec(line), ol = /^\s*\d+[.)]\s+(.*)$/.exec(line), h = /^#{1,4}\s+(.*)$/.exec(line);
      if (ul || ol) { const ordered = !!ol; if (list && list.ordered !== ordered) flush(k + "f"); (list ??= { ordered, items: [] }).items.push((ul ?? ol)![1]); return; }
      flush(k + "f");
      if (h) blocks.push(<p key={k} className="font-head font-semibold">{inline(h[1], k)}</p>);
      else if (line.trim()) blocks.push(<p key={k}>{inline(line, k)}</p>);
    });
    flush(`p${pi}-end`);
  });
  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}
