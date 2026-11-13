import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui';

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
      }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
