/**
 * Pseudocode-Beispiel mit Python-/JavaScript-Fassung: oben der Code in der gewählten Sprache (Umschalter, gemerkt),
 * darunter der Pseudocode „so schreibst du es in der Prüfung“. Ohne Fassung bleibt es beim Pseudocode wie bisher.
 * Alles nur als Text (React), kein HTML.
 */
import { useState, type ReactNode } from "react";
import { variantsFor, type CodeLang } from "@/lib/code-variants";

const KEY = "tap2coach-codesprache";
const LBL: Record<CodeLang, string> = { python: "Python", javascript: "JavaScript" };
const readLang = (): CodeLang => { try { return localStorage.getItem(KEY) === "javascript" ? "javascript" : "python"; } catch { return "python"; } };

/** pseudo: der Pseudocode; children: wie er bisher dargestellt wird (z. B. <pre>), sonst ein einfaches <pre> */
export function CodeVariants({ pseudo, children, className }: { pseudo: string; children?: ReactNode; className?: string }) {
  const v = variantsFor(pseudo), [lang, setLang] = useState<CodeLang>(readLang);
  const plain = children ?? <pre className={className}>{pseudo}</pre>;
  if (!v) return <>{plain}</>;
  const pick = (l: CodeLang) => { setLang(l); try { localStorage.setItem(KEY, l); } catch { /* privat */ } };
  return (
    <div className="cv">
      <div className="cv-head">
        <div className="segs cv-tabs" role="tablist" aria-label="Programmiersprache">
          {(Object.keys(LBL) as CodeLang[]).map((l) => <button key={l} type="button" role="tab" aria-selected={lang === l} className={`seg ${lang === l ? "on" : ""}`} onClick={() => pick(l)}>{LBL[l]}</button>)}
        </div>
      </div>
      <pre className="cv-code">{v[lang]}</pre>
      <div className="cv-pseudo">
        <span className="cv-lbl">Pseudocode – so schreibst du es in der Prüfung</span>
        {plain}
      </div>
    </div>
  );
}
