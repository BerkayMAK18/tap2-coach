// Content-Security-Policy für die veröffentlichte index.html (läuft im Deploy, nach dem Eintragen von Sync-URL und Version).
//
// Warum: Sollte je ein Fehler HTML aus fremden Daten ungefiltert einfügen (XSS), blockiert der Browser trotzdem
//   - jedes eingeschleuste Skript (nur die zwei eigenen Inline-Skripte sind per SHA-256 erlaubt, plus Dateien von hier),
//   - jede Verbindung zu fremden Servern (Daten können nur zu Supabase und zur GitHub-API fließen).
// GitHub Pages kann keine HTTP-Header setzen, deshalb als <meta>. Die Hashes ändern sich mit jedem Build,
// darum werden sie hier berechnet und nicht von Hand gepflegt.
//
// Aufruf: node tools/csp.js [datei]   (Standard: index.html, wird überschrieben)
"use strict";
const fs = require("fs");
const crypto = require("crypto");

const file = process.argv[2] || "index.html";
let html = fs.readFileSync(file, "utf8");
if (html.includes('http-equiv="Content-Security-Policy"')) { console.log("CSP schon vorhanden."); process.exit(0); }

// Inline-Skripte = <script> ohne src. Der Browser hasht exakt den Text zwischen den Tags.
const hashes = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html))) hashes.push("'sha256-" + crypto.createHash("sha256").update(m[1], "utf8").digest("base64") + "'");
if (hashes.length !== 2) { console.error(`Erwartet 2 Inline-Skripte, gefunden ${hashes.length}. Struktur der index.html geändert? Dann diese Datei anpassen.`); process.exit(1); }
if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(re, ""))) { console.error("Inline-Event-Handler (onclick=… o. ä.) im HTML gefunden – die CSP würde sie blockieren."); process.exit(1); }

const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(" ")} 'wasm-unsafe-eval'`, // wasm: SQL-Editor (sql.js)
  "style-src 'self' 'unsafe-inline'",                         // Inline-Styles und CodeMirror
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co https://api.github.com", // Sync/Rangliste, Patch Notes
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const anchor = '<meta charset="utf-8">';
if (!html.includes(anchor)) { console.error("<meta charset> nicht gefunden."); process.exit(1); }
html = html.replace(anchor, `${anchor}\n<meta http-equiv="Content-Security-Policy" content="${csp}">\n<meta name="referrer" content="strict-origin-when-cross-origin">`);
fs.writeFileSync(file, html);
console.log("CSP eingetragen: " + hashes.length + " Inline-Skripte erlaubt.");
