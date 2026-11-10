#!/usr/bin/env node
// Prüft vor dem Veröffentlichen, dass der Lernstand der Nutzer erhalten bleibt.
//
// Der Lernstand hängt an Frage-IDs, die sich aus der Position ergeben (m72 = 73. Auswahlfrage,
// k:sql3 = 4. SQL-Karte). Wird mittendrin eingefügt, gelöscht oder umsortiert, rutschen IDs –
// und der Fortschritt hängt an der falschen Frage. Dieses Skript vergleicht die neue index.html
// mit der aktuell veröffentlichten Version und bricht mit Fehler ab, wenn so etwas passiert.
//
// Aufruf:  node tools/check-ids.js [alt.html|URL] [neu.html]
//          ohne Argumente: alt = live veröffentlichte Seite, neu = ./index.html
"use strict";
const fs = require("fs");
const path = require("path");

const LIVE = "https://berkaymak18.github.io/tap2-coach/index.html";
const STORAGE_KEY = 'const KEY = "tap2coach"';

async function load(src) {
  if (/^https?:\/\//.test(src)) {
    const r = await fetch(src + (src.includes("?") ? "&" : "?") + "nocache=" + Date.now());
    if (!r.ok) throw new Error(`${src} nicht erreichbar (HTTP ${r.status})`);
    return r.text();
  }
  return fs.readFileSync(src, "utf8");
}

// Datenteil der Seite auswerten (alles vor der eigentlichen App-Logik)
function extract(html, label) {
  const a = html.indexOf("<script>\nconst ICONS");
  const b = html.indexOf('(function () {\n  "use strict";');
  if (a < 0 || b < 0) throw new Error(`${label}: Datenteil der Seite nicht gefunden`);
  const data = html.slice(a + 8, b);
  const names = [...data.matchAll(/^(?:const|let) ([A-Z_][A-Z0-9_]*) *=/gm)].map((m) => m[1]);
  let D;
  try { D = new Function(data + "; return {" + names.join(",") + "};")(); }
  catch (e) { throw new Error(`${label}: Datenteil enthält einen Fehler – ${e.message}`); }
  const need = ["MC", "CARDS_RAW", "TOPICS", "DECKS", "UEB"];
  need.forEach((n) => { if (!D[n]) throw new Error(`${label}: ${n} fehlt`); });
  const lists = { MC: D.MC.map((m) => ({ text: m[2], topic: m[0] + "|" + m[1] })) };
  Object.entries(D.CARDS_RAW).forEach(([deck, l]) => { lists["Deck " + deck] = l.map((c) => ({ text: c[0] })); });
  const ev = (D.EVENTS || []).flatMap((e) => e.kap.flatMap((k) => k.q.map((x) => e.id + ":" + x[1]))); // Event-Fragen: feste IDs
  return { lists, topics: D.TOPICS.map((t) => t.id), decks: Object.keys(D.DECKS), ueb: D.UEB.map((u) => u.id), ev, html };
}

function check(oldD, newD) {
  const errors = [], notes = [];
  // 1. Fragenlisten: nichts löschen, nichts verschieben
  Object.entries(oldD.lists).forEach(([name, oldL]) => {
    const newL = newD.lists[name];
    if (!newL) { errors.push(`${name}: komplett entfernt (${oldL.length} Fragen mit Lernstand).`); return; }
    if (newL.length < oldL.length) errors.push(`${name}: ${oldL.length - newL.length} Frage(n) gelöscht (vorher ${oldL.length}, jetzt ${newL.length}). Fragen nie löschen – Inhalt stattdessen ersetzen.`);
    const newPos = new Map(); newL.forEach((q, i) => { if (!newPos.has(q.text)) newPos.set(q.text, i); });
    let moved = 0, firstMoved = null, changed = 0;
    oldL.forEach((q, i) => {
      if (newL[i] && newL[i].text === q.text) return;
      const j = newPos.get(q.text);
      if (j !== undefined && j !== i) { moved++; if (!firstMoved) firstMoved = { i, j, text: q.text }; }
      else changed++;
    });
    if (moved) errors.push(`${name}: ${moved} Frage(n) haben ihre Position geändert, z. B. Nr. ${firstMoved.i + 1} → Nr. ${firstMoved.j + 1} („${firstMoved.text.slice(0, 60)}…“). Neue Fragen nur am Ende anhängen, nicht einfügen oder umsortieren.`);
    if (MC_TOPIC_CHANGED(name, oldL, newL)) errors.push(`${name}: Bereich oder Kategorie bestehender Auswahlfragen geändert.`);
    if (changed) notes.push(`${name}: ${changed} Frage(n) an gleicher Stelle umformuliert – in Ordnung.`);
    if (newL.length > oldL.length) notes.push(`${name}: ${newL.length - oldL.length} neue Frage(n) am Ende – in Ordnung.`);
  });
  // 2. Interne Namen, an denen Lernstand hängt
  const lost = (a, b) => a.filter((x) => !b.includes(x));
  const t = lost(oldD.topics, newD.topics); if (t.length) errors.push(`Themen-IDs entfernt oder umbenannt: ${t.join(", ")} (eigene Fragen hängen daran).`);
  const d = lost(oldD.decks, newD.decks); if (d.length) errors.push(`Deck-Namen entfernt oder umbenannt: ${d.join(", ")}.`);
  const u = lost(oldD.ueb, newD.ueb); if (u.length) errors.push(`Aufgaben-IDs entfernt oder umbenannt: ${u.join(", ")} (Aufgabenpunkte hängen daran).`);
  const ev = lost(oldD.ev, newD.ev); if (ev.length) errors.push(`Event-Fragen entfernt oder umbenannt: ${ev.slice(0, 5).join(", ")}${ev.length > 5 ? " …" : ""} (Event-Lernstand hängt an diesen IDs).`);
  if (new Set(newD.ev).size !== newD.ev.length) errors.push("Doppelte Event-Frage-IDs – jede ID darf pro Event nur einmal vorkommen.");
  if (newD.ev.length > oldD.ev.length) notes.push(`${newD.ev.length - oldD.ev.length} neue Event-Frage(n) – in Ordnung.`);
  // 3. Speicherschlüssel und Skript-Block
  if (!newD.html.includes(STORAGE_KEY)) errors.push("Der Speicherschlüssel \"tap2coach\" wurde geändert – alle Nutzer würden mit leerem Stand starten.");
  const closes = (newD.html.match(/<\/script/gi) || []).length;
  if (closes !== 2) errors.push(`Es gibt ${closes} „</script>“-Stellen statt 2. Steht „</script>“ in einem Fragetext, beendet es das Programm vorzeitig – dort „<\\/script>“ schreiben.`);
  return { errors, notes };
}
function MC_TOPIC_CHANGED(name, oldL, newL) {
  if (name !== "MC") return false;
  return oldL.some((q, i) => newL[i] && newL[i].topic !== q.topic);
}

(async () => {
  const oldSrc = process.argv[2] || LIVE;
  const newSrc = process.argv[3] || path.join(__dirname, "..", "index.html");
  let oldHtml;
  try { oldHtml = await load(oldSrc); }
  catch (e) {
    console.log(`⚠️  Vergleichsversion nicht verfügbar (${e.message}) – Prüfung übersprungen.`);
    process.exit(0);
  }
  const oldD = extract(oldHtml, "Veröffentlichte Version");
  const newD = extract(await load(newSrc), "Neue Version");
  const { errors, notes } = check(oldD, newD);
  const count = (D) => Object.values(D.lists).reduce((a, l) => a + l.length, 0);
  console.log(`Vergleich: ${oldSrc}  →  ${newSrc}`);
  console.log(`Fragen: ${count(oldD)} → ${count(newD)}`);
  notes.forEach((n) => console.log("  ✓ " + n));
  if (errors.length) {
    console.log("\n❌ Nicht veröffentlichen – der Lernstand der Nutzer wäre betroffen:");
    errors.forEach((e) => console.log("  • " + e));
    process.exit(1);
  }
  console.log("\n✅ Alles in Ordnung: Der Lernstand aller Nutzer bleibt erhalten.");
})().catch((e) => { console.error("❌ " + e.message); process.exit(1); });
