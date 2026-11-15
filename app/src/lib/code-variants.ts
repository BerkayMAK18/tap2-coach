/**
 * Python-/JavaScript-Fassungen der Pseudocode-Beispiele (nur neue App, Entscheidung 15.11.2026).
 * Die Inhalte kommen weiter aus der Live-App (Pseudocode, Format der IHK-Prüfung). Zu jedem Pseudocode-Block gibt es in
 * src/content/code-variants.json eine Python- und eine JavaScript-Fassung, zugeordnet über eine Prüfsumme des
 * Pseudocode-Texts – so passt die Zuordnung überall, wo derselbe Block vorkommt (Lernpaket, Karte, Aufgabe, Prüfung).
 * Ändert die Live-App einen Block, passt die Prüfsumme nicht mehr und es erscheint nur der Pseudocode (Test meldet es).
 */
import raw from "@/content/code-variants.json";

/** erklaerung: je Pseudocode-Zeile eine kurze Erklärung (gleiche Zeilenzahl wie der vereinheitlichte Pseudocode) */
export type CodeVariant = { python: string; javascript: string; erklaerung?: string[] };
export type CodeLang = "python" | "javascript";
const VARIANTS = raw as Record<string, CodeVariant | null>;

/** Pseudocode wie dargestellt vereinheitlichen (Zeilenenden, Leerzeichen am Zeilenende, Rand) */
export const normCode = (s: string) => String(s ?? "").replace(/\r/g, "").replace(/[ \t]+$/gm, "").trim();
/** FNV-1a (32 Bit) der vereinheitlichten Fassung */
export function codeKey(s: string) { const t = normCode(s); let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
export const variantsFor = (pseudo: string): CodeVariant | null => VARIANTS[codeKey(pseudo)] ?? null;
export const variantKeys = () => Object.keys(VARIANTS).filter((k) => VARIANTS[k]);
