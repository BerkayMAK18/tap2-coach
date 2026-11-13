/**
 * Exportiert die Event-Kataloge der Live-App (../index.html) als JSON nach src/content/catalogs/.
 *
 * Die Live-App liest nichts davon; das Skript liest index.html nur. Es führt den Datenteil
 * (erstes <script> bis zur Haupt-IIFE) in einer Node-VM aus und gibt EVENTS (+ FIG für Abbildungen) zurück.
 *
 * Format eines Katalogs (Version 1), Grundlage der späteren Katalog-Bibliothek:
 *   { schema: 1, id, kurz, titel, sub, art: "event", enabled, start, ende, reward, info, tipps,
 *     tags: [...], kapitel: [{ id, titel, lern: [[begriff, text]], fig, items: [...] }] }
 * Items haben dieselbe Form wie src/content/tap2.json (type "card" | "mc"), die IDs bleiben exakt
 * wie in der Live-App: "ev:<event>:<frage>". Nie umnummerieren, sonst gehen Lernstände verloren.
 *
 * Schalter: Kataloge in DISABLED werden mit enabled:false exportiert (die App blendet sie aus).
 *
 * Aufruf: npm run catalog:export
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const DISABLED = new Set(["wpf"]); // WPF-PM-Event ist in der neuen App vorerst deaktiviert (Live unverändert)

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "..", "index.html"), "utf8");
const lines = html.split("\n");
const start = lines.findIndex((l, i) => i > 10 && l.trim() === "<script>");
const end = lines.findIndex((l, i) => i > start && l.startsWith("(function () {"));
if (start < 0 || end < 0) throw new Error("Datenteil in index.html nicht gefunden (Struktur geändert?)");

const code = lines.slice(start + 1, end).join("\n") + "\n;({ EVENTS, FIG });";
const { EVENTS, FIG } = vm.runInNewContext(code, {});

const toItem = (evId, kapId) => (q) => {
  const [kind, id] = q;
  const base = { id: `ev:${evId}:${id}`, topic: kapId };
  if (kind === "k") return { ...base, type: "card", q: q[2], a: q[3], ...(q[4] ? { note: q[4] } : {}) };
  if (kind === "m") return { ...base, type: "mc", q: q[2], options: q[3], correct: q[4], note: q[5] };
  throw new Error(`Unbekannter Fragetyp ${kind} in ${evId}:${id}`);
};

const outDir = join(root, "src", "content", "catalogs");
mkdirSync(outDir, { recursive: true });
const index = [];
for (const ev of EVENTS) {
  const kapitel = ev.kap.map((k) => ({
    id: k.id,
    titel: k.titel,
    lern: k.lern ?? [],
    ...(k.fig ? { fig: k.fig, figSvg: typeof FIG?.[k.fig] === "string" ? FIG[k.fig] : undefined } : {}),
    items: (k.q ?? []).map(toItem(ev.id, k.id)),
  }));
  const { kap: _k, ...rest } = ev;
  const cat = {
    schema: 1,
    ...rest,
    art: "event",
    enabled: !DISABLED.has(ev.id),
    tags: ["FIAE", "Event", ev.kurz],
    kapitel,
  };
  writeFileSync(join(outDir, `event-${ev.id}.json`), JSON.stringify(cat, null, 2) + "\n");
  index.push({ id: ev.id, datei: `event-${ev.id}.json`, titel: ev.titel, kurz: ev.kurz, art: "event", enabled: cat.enabled, ende: ev.ende, fragen: kapitel.reduce((n, k) => n + k.items.length, 0) });
}
writeFileSync(join(outDir, "index.json"), JSON.stringify({ schema: 1, quelle: "index.html (Live-App)", kataloge: index }, null, 2) + "\n");
console.log(index.map((c) => `${c.id}: ${c.fragen} Fragen${c.enabled ? "" : " (deaktiviert)"}`).join("\n"));
