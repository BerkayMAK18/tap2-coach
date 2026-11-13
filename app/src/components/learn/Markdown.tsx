import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui';

/*
 * Sicherheit: Inhalte kommen auch von der KI (und indirekt aus Nutzerdateien → Prompt-Injection möglich).
 * - Kein rehype-raw: HTML im Markdown wird nicht ausgeführt; react-markdown entfernt javascript:-Links.
 * - Externe Bilder werden nicht geladen, nur als Link angezeigt. Sonst könnte eine manipulierte Antwort
 *   Gesprächsinhalte in eine Bild-URL packen und beim Laden an fremde Server schicken.
 * - Links öffnen in neuem Tab ohne Referrer.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose max-w-none font-text text-body-300 text-ink prose-headings:font-head prose-headings:text-ink prose-strong:text-ink prose-a:text-ink prose-code:text-ink prose-pre:bg-canvas prose-pre:text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
        table: ({ children }) => <div className="not-prose min-w-0"><Table>{children}</Table></div>,
        thead: ({ children }) => <TableHeader>{children}</TableHeader>,
        tbody: ({ children }) => <TableBody>{children}</TableBody>,
        tr: ({ children }) => <TableRow>{children}</TableRow>,
        th: ({ children }) => <TableHead>{children}</TableHead>,
        td: ({ children }) => <TableCell>{children}</TableCell>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        img: ({ src, alt }) => typeof src === "string" && /^https?:/i.test(src)
          ? <a href={src} target="_blank" rel="noopener noreferrer">{alt || "Bild öffnen"}</a>
          : null,
      }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
