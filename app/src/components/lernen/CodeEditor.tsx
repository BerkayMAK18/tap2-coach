/**
 * Code-Editor (CodeMirror) in Code-Karten – wie mountEditors() der Live-App: Bis der Editor geladen ist, steht ein
 * einfaches Textfeld bzw. der Text da (gleiches Aussehen, .cm-fallback); danach ersetzt der Editor es.
 */
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@/lib/editor";

type Props = { lang: string; edit: boolean; doc: string; label: string; onChange?: (v: string) => void; onSubmit?: () => void; onRun?: () => void };
let cm: Promise<typeof import("@/lib/editor")> | null = null;
const loadCM = () => (cm ??= import("@/lib/editor").catch((e) => { cm = null; throw e; }));

export function CodeEditor({ lang, edit, doc, label, onChange, onSubmit, onRun }: Props) {
  const host = useRef<HTMLDivElement>(null), fb = useRef<HTMLTextAreaElement>(null), [ready, setReady] = useState(false);
  const cb = useRef({ onChange, onSubmit, onRun }); cb.current = { onChange, onSubmit, onRun };
  useEffect(() => {
    let ed: Editor | null = null, gone = false;
    loadCM().then((m) => {
      if (gone || !host.current) return;
      const hadFocus = !!fb.current && document.activeElement === fb.current, start = edit && fb.current ? fb.current.value : doc;
      ed = m.create(host.current, {
        doc: start, lang, readOnly: !edit, label, placeholder: edit ? (lang === "sql" ? "SELECT …" : "Tippe hier deine Lösung …") : "",
        onChange: edit ? (v) => cb.current.onChange?.(v) : null, onSubmit: edit ? () => cb.current.onSubmit?.() : null, onRun: edit && onRun ? () => cb.current.onRun?.() : null,
      });
      setReady(true);
      if (hadFocus) ed.focus();
    }).catch(() => { /* ohne Editor bleibt das Textfeld nutzbar */ });
    return () => { gone = true; ed?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`cmwrap${edit ? " edit" : ""}`} ref={host}>
      {!ready && (edit
        ? <textarea ref={fb} className="cm-fallback" spellCheck={false} autoCapitalize="off" aria-label="Deine Lösung" defaultValue={doc} onChange={(e) => onChange?.(e.target.value)} />
        : <pre className="cm-fallback">{doc}</pre>)}
    </div>
  );
}
