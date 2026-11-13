import { useEffect, useRef, useState } from 'react';
import { Button, Label, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/ui';
import { SQL_SEED } from '@/lib/practice';

type Language = 'python' | 'sql';
type Result = { columns: string[]; values: (string | number | null)[][] };
export function CodeEditor({ language, initialCode, onChange, storageKey }: { language: Language; initialCode: string; onChange?: (code: string) => void; storageKey?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const worker = useRef<Worker | null>(null);
  const editor = useRef<import('@codemirror/view').EditorView | null>(null);
  const latest = useRef(initialCode);
  const change = useRef(onChange);
  change.current = onChange;
  const [output, setOutput] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [stdin, setStdin] = useState('');
  const [failed, setFailed] = useState(false);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let cancelled = false;
    let mountedView: import('@codemirror/view').EditorView | null = null;
    latest.current = (storageKey ? localStorage.getItem(storageKey) : null) ?? initialCode;
    change.current?.(latest.current);
    async function mount() {
      const [{ EditorView, lineNumbers, keymap }, { EditorState }, { defaultKeymap, indentWithTab, history, historyKeymap }, { syntaxHighlighting, defaultHighlightStyle }, { python }, { sql, SQLite }] = await Promise.all([
        import('@codemirror/view'), import('@codemirror/state'), import('@codemirror/commands'), import('@codemirror/language'), import('@codemirror/lang-python'), import('@codemirror/lang-sql'),
      ]);
      if (cancelled || !container.current) return;
      container.current.replaceChildren();
      mountedView = new EditorView({ parent: container.current, state: EditorState.create({ doc: latest.current, extensions: [
        lineNumbers(), history(), keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]), syntaxHighlighting(defaultHighlightStyle),
        language === 'python' ? python() : sql({ dialect: SQLite }), EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': language === 'python' ? 'Python-Code' : 'SQL-Code' }),
        EditorView.updateListener.of(update => { if (update.docChanged) { latest.current = update.state.doc.toString(); change.current?.(latest.current); if (storageKey) localStorage.setItem(storageKey, latest.current); } }),
      ] }) });
      editor.current = mountedView;
    }
    mount().catch(e => { setFailed(true); setOutput('Editor konnte nicht gestartet werden: ' + String(e)); });
    return () => { cancelled = true; mountedView?.destroy(); if (editor.current === mountedView) editor.current = null; worker.current?.terminate(); worker.current = null; if (deadline.current) clearTimeout(deadline.current); };
  }, [initialCode, language, storageKey]);

  function stop() { worker.current?.terminate(); worker.current = null; if (deadline.current) clearTimeout(deadline.current); setBusy(false); setOutput('Ausführung gestoppt.'); }
  function execute() {
    setBusy(true); setResults([]); setOutput(language === 'python' ? 'Python wird gestartet…' : 'SQL wird ausgeführt…');
    if (!worker.current) worker.current = language === 'python' ? new Worker('/runtimes/python-worker.js', { type: 'module' }) : new Worker('/runtimes/code-worker.js');
    worker.current.onmessage = ({ data }) => { if (deadline.current) clearTimeout(deadline.current); setBusy(false); setOutput(data.output); setResults(data.results ?? []); };
    worker.current.onerror = () => { stop(); setOutput('Ausführung fehlgeschlagen. Starte erneut.'); };
    // A separate worker keeps infinite loops from blocking navigation; a stop button cancels immediately.
    deadline.current = setTimeout(() => { stop(); setOutput('Zeitlimit erreicht. Prüfe deinen Code auf Endlosschleifen.'); }, 120000);
    worker.current.postMessage({ language, code: latest.current, stdin, seed: SQL_SEED });
  }
  function reset() {
    stop(); setOutput(''); setResults([]);
    editor.current?.dispatch({ changes: { from: 0, to: editor.current.state.doc.length, insert: initialCode } });
  }
  return <div className="space-y-4">
    <Label>{language === 'python' ? 'Python-Code' : 'SQL-Code (SQLite)'}</Label>
    <div ref={container} className="code-editor overflow-hidden rounded-sm border-2 border-border bg-card text-card-foreground" />
    {failed && <Textarea aria-label="Code als Text" defaultValue={latest.current} onChange={e => { latest.current = e.target.value; change.current?.(e.target.value); }} rows={10} />}
    {language === 'python' && <div className="space-y-2"><Label htmlFor="stdin">Eingaben für input() (eine pro Zeile)</Label><Textarea id="stdin" value={stdin} onChange={e=>setStdin(e.target.value)} rows={2}/></div>}
    <div className="flex flex-wrap gap-3">
      <Button variant="solid" onClick={execute} disabled={busy}>Ausführen</Button>
      {busy && <Button onClick={stop}>Stoppen</Button>}
      <Button onClick={reset} disabled={busy}>{language === 'sql' ? 'Code & Datenbank zurücksetzen' : 'Code zurücksetzen'}</Button>
    </div>
    <div className="space-y-2" role="status"><p className="font-text text-body-200 font-medium">Ausgabe</p><pre className="max-h-96 overflow-auto whitespace-pre-wrap bg-muted p-4 font-text text-body-300 text-foreground">{output || '—'}</pre></div>
    {results.map((r,n) => <div key={n} className="overflow-x-auto"><Table><TableHeader><TableRow>{r.columns.map(c=><TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{r.values.slice(0,200).map((row,i)=><TableRow key={i}>{row.map((v,j)=><TableCell key={j}>{v === null ? 'NULL' : String(v)}</TableCell>)}</TableRow>)}</TableBody></Table><p className="text-body-200">{r.values.length} Zeilen{r.values.length > 200 ? ' · erste 200 angezeigt' : ''}</p></div>)}
  </div>;
}