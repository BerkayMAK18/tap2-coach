/**
 * Exportiert alle Lerninhalte der Live-App (../index.html) als JSON-Kataloge nach src/content/generated/.
 *
 * Die Live-App bleibt die Quelle der Inhalte, bis die neue App sie ersetzt. Das Skript liest index.html nur:
 * Es führt den Datenteil (erstes <script> bis zur Haupt-IIFE) in einer Node-VM aus und baut daraus
 *   - tap2.json      Kernkatalog TAP2: Themen, Fragen (MC + Karten), Aufgaben, offene Prüfungsfragen,
 *                    Lernpakete, Notationshilfen, Abbildungen, SQL-Schema
 *   - event-<id>.json je Event (Kapitel mit Lernkarten, Fragen, Belohnung, Zeitraum)
 *   - index.json      Verzeichnis aller Kataloge (Grundlage der Katalog-Bibliothek)
 *
 * IDs werden exakt wie in der Live-App gebildet (siehe BASE_Q dort):
 *   MC "m<i>" (Index in MC), Karte "k:<deck><i>" (Index im Deck, ab 0), offene Frage "o<i>", Event "ev:<event>:<frage>".
 * Sie sind die Schlüssel des Lernstands – nie umnummerieren. src/content/catalog.test.ts prüft das.
 *
 * Aufrufe:
 *   npm run catalog:export   Dateien neu schreiben
 *   npm run catalog:check    nur prüfen, ob die Dateien zur index.html passen (Teil von npm run build)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const DISABLED = new Set(["wpf"]); // WPF-PM-Event ist in der neuen App vorerst deaktiviert (Live unverändert)
const CHECK = process.argv.includes("--check");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "..", "index.html");
if (!existsSync(src)) {
  // Ohne Live-Datei (z. B. App einzeln ausgecheckt) gilt der eingecheckte Stand.
  console.log("[catalog] ../index.html nicht gefunden – eingecheckte Kataloge werden verwendet.");
  process.exit(0);
}
const lines = readFileSync(src, "utf8").split("\n");
const start = lines.findIndex((l, i) => i > 10 && l.trim() === "<script>");
const end = lines.findIndex((l, i) => i > start && l.startsWith("(function () {"));
if (start < 0 || end < 0) throw new Error("Datenteil in index.html nicht gefunden (Struktur geändert?)");
const dataCode = lines.slice(start + 1, end).join("\n");
const D = vm.runInNewContext(dataCode + "\n;({ ICONS, DECKS, CARDS_RAW, SQL_SCHEMA, UEB, CATS, MC, OPEN, TOPICS, CARD_TOPIC, MC_TOPIC, PAKETE, NOTATION, FIG, EVENTS });", {});
const sourceHash = createHash("sha256").update(dataCode).digest("hex").slice(0, 12);

// ---- Kernkatalog: gleiche Ableitung wie BASE_Q in der Live-App
const DECK_TOPIC = {}, CAT_TOPIC = {};
D.TOPICS.forEach((t) => { t.decks.forEach((d) => { DECK_TOPIC[d] = t.id; }); t.cats.forEach((c) => { CAT_TOPIC[c] = t.id; }); });
const questions = [];
D.MC.forEach((m, i) => {
  const id = "m" + i;
  questions.push({ id, type: "mc", topic: D.MC_TOPIC[id] || m[6] || CAT_TOPIC[m[0] + "|" + m[1]] || "T01", teil: m[0], cat: m[1], q: m[2], opts: m[3], right: m[4], why: m[5] });
});
Object.entries(D.CARDS_RAW).forEach(([deck, list]) => list.forEach(([f, b, n], i) => {
  const id = "k:" + deck + i;
  questions.push({ id, type: "card", topic: D.CARD_TOPIC[id] || DECK_TOPIC[deck] || "T01", deck, q: f, a: b, note: n || "", code: !D.DECKS[deck] || D.DECKS[deck].teil !== "SoWi" });
}));
const open = D.OPEN.map((o, i) => ({ id: "o" + i, ...o }));
const figs = Object.fromEntries(Object.entries(D.FIG).filter(([, v]) => Array.isArray(v) && typeof v[0] === "string").map(([k, v]) => [k, { svg: v[0], caption: v[1] ?? "" }]));

const tap2 = {
  schema: 1,
  id: "tap2-fiae",
  titel: "TAP2 Fachinformatik Anwendungsentwicklung",
  art: "pruefung",
  tags: ["FIAE", "TAP2", "IHK"],
  quelle: { datei: "index.html", hash: sourceHash },
  sqlSchema: D.SQL_SCHEMA,
  topics: D.TOPICS,
  decks: D.DECKS,
  cats: D.CATS,
  pakete: D.PAKETE,
  ueb: D.UEB,
  open,
  notation: D.NOTATION,
  figs,
  // Icon-Pfade der Live-App (für <Ic/>, gleiche Optik) – inkl. der später im Code ergänzten (ICONS.x = '…')
  icons: { ...D.ICONS, ...Object.fromEntries([...lines.join("\n").matchAll(/ICONS\.([a-z0-9]+) = '([^']*)';/g)].map((m) => [m[1], m[2]])) },
  questions,
};

// ---- Events
const events = D.EVENTS.map((ev) => {
  const { kap, ...rest } = ev;
  return {
    schema: 1,
    ...rest,
    art: "event",
    enabled: !DISABLED.has(ev.id),
    tags: ["FIAE", "Event", ev.kurz],
    kapitel: kap.map((k) => ({
      id: k.id,
      titel: k.titel,
      lern: k.lern ?? [],
      ...(k.fig ? { fig: k.fig } : {}),
      items: (k.q ?? []).map((q) => {
        const [kind, qid] = q;
        const base = { id: `ev:${ev.id}:${qid}`, topic: `ev:${ev.id}:${k.id}` };
        if (kind === "k") return { ...base, type: "card", q: q[2], a: q[3], note: q[4] || "", code: true };
        if (kind === "m") return { ...base, type: "mc", q: q[2], opts: q[3], right: q[4], why: q[5] };
        throw new Error(`Unbekannter Fragetyp ${kind} in ${ev.id}:${qid}`);
      }),
    })),
  };
});

const index = {
  schema: 1,
  quelle: { datei: "index.html", hash: sourceHash },
  kataloge: [
    { id: tap2.id, datei: "tap2.json", titel: tap2.titel, art: "pruefung", enabled: true, tags: tap2.tags, fragen: questions.length },
    ...events.map((e) => ({ id: e.id, datei: `event-${e.id}.json`, titel: e.titel, art: "event", enabled: e.enabled, tags: e.tags, ende: e.ende, fragen: e.kapitel.reduce((n, k) => n + k.items.length, 0) })),
  ],
};

// ---- Schreiben bzw. prüfen
const outDir = join(root, "src", "content", "generated");
const files = { "tap2.json": tap2, "index.json": index, ...Object.fromEntries(events.map((e) => [`event-${e.id}.json`, e])) };
let stale = [];
if (!CHECK) mkdirSync(outDir, { recursive: true });
for (const [name, data] of Object.entries(files)) {
  const text = JSON.stringify(data, null, 1) + "\n";
  const path = join(outDir, name);
  if (CHECK) { if (!existsSync(path) || readFileSync(path, "utf8") !== text) stale.push(name); }
  else writeFileSync(path, text);
}
if (CHECK && stale.length) {
  console.error(`[catalog] veraltet: ${stale.join(", ")} – bitte "npm run catalog:export" ausführen.`);
  process.exit(1);
}
console.log(`[catalog] ${CHECK ? "aktuell" : "geschrieben"}: ${questions.length} Fragen, ${open.length} offene, ${D.UEB.length} Aufgaben, ${Object.keys(figs).length} Abbildungen, ${events.length} Events (Quelle ${sourceHash}).`);
