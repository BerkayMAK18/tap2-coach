/**
 * Kopiert die Laufzeiten für Python (Pyodide) und SQL (sql.js) aus node_modules nach public/runtimes.
 *
 * Warum: Die Dateien sind ~14 MB groß und sollen nicht ins Git-Repo. Sie werden lokal ausgeliefert
 * (kein CDN), damit Code-Aufgaben ohne externe Skripte laufen. Die Web-Worker in public/runtimes/*.js
 * laden sie über feste Pfade (/runtimes/python/…, /runtimes/sql/…).
 *
 * Läuft automatisch vor `npm run dev` und `npm run build` (siehe package.json). Vorhandene Dateien
 * gleicher Größe werden übersprungen.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");
const out = join(root, "public", "runtimes");

const files = [
  ["pyodide/pyodide.mjs", "python/pyodide.mjs"],
  ["pyodide/pyodide.asm.mjs", "python/pyodide.asm.mjs"],
  ["pyodide/pyodide.asm.wasm", "python/pyodide.asm.wasm"],
  ["pyodide/python_stdlib.zip", "python/python_stdlib.zip"],
  ["pyodide/pyodide-lock.json", "python/pyodide-lock.json"],
  ["sql.js/dist/sql-wasm.js", "sql/sql-wasm.js"],
  ["sql.js/dist/sql-wasm.wasm", "sql/sql-wasm.wasm"],
];

let copied = 0;
for (const [from, to] of files) {
  const src = join(nm, from);
  const dst = join(out, to);
  if (!existsSync(src)) {
    console.error(`[runtimes] fehlt: ${from} – erst "npm install" ausführen.`);
    process.exit(1);
  }
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  copied++;
}
console.log(`[runtimes] ${copied ? copied + " Datei(en) kopiert" : "aktuell"}.`);
