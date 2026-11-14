/**
 * Prüfer-Tutor: eine Sitzung = ein Thema. Reine Funktionen für Nachrichten, Runden und Belege – Zustand in store/tutor.ts.
 *
 * Ablauf: Übergabe (Stand je Konzept, Fehlvorstellungen, Inhalte der Lernpakete) → Tutor ruft je Runde pruefer_runde auf
 * (Chat-Text, Aufgabe mit Material, Bewertung, Graph-Updates) → App prüft (tutor-schema.ts), zeigt alles selbst an und
 * schickt das tool_result mit meiner nächsten Nachricht zurück. Verlauf wird nur angehängt (Denk-Blöcke unverändert).
 *
 * Belege: jede Bewertung (je geprüftem Konzept) und jedes Graph-Update wird ein Beleg im Tutor-Stand (tutor-state.ts).
 * „Sicher, aber falsch“ (Sicherheit ≥ ziemlich sicher, weniger als die Hälfte der Punkte) wird zur Fehlvorstellung,
 * auch wenn der Tutor keine meldet.
 */
import { TOOL_NAME, parseRunde, type Aufgabe, type Bewertung, type KnownIds, type Runde } from "./tutor-schema";
import type { Ev } from "./tutor-state";

// ---------- Nachrichten im Format der Claude-API
export type TextBlock = { type: "text"; text: string };
export type ToolUse = { type: "tool_use"; id: string; name: string; input: unknown };
export type ToolResult = { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };
/** Weitere Blöcke der API (thinking, redacted_thinking, fallback) – werden unverändert zurückgeschickt */
export type RawBlock = { type: string; [k: string]: unknown };
export type Block = TextBlock | ToolUse | ToolResult | RawBlock;
export type ApiMsg = { role: "user" | "assistant"; content: Block[] };
const isUse = (b: Block): b is ToolUse => b.type === "tool_use" && typeof (b as ToolUse).id === "string" && (b as ToolUse).name === TOOL_NAME;
const isText = (b: Block): b is TextBlock => b.type === "text" && typeof (b as TextBlock).text === "string";

export type Model = "haiku" | "sonnet";
/** Sicherheit: 0 geraten · 1 unsicher · 2 ziemlich sicher · 3 sicher */
export const SICHER = ["geraten", "unsicher", "ziemlich sicher", "sicher"] as const;
export type Sicher = 0 | 1 | 2 | 3;
export type UserKind = "start" | "antwort" | "schlauch" | "ende";
export type UserMeta = { kind: UserKind; text?: string; gedanke?: string; sich?: Sicher; aufgabe?: string };
export type Graded = { key: string; topic: string; punkte: number; max: number; sich?: Sicher; first: boolean };
/**
 * Bewertete Tutor-Aufgabe → Antwort im Belohnungs-Modul (gm.answer / onAnswer), genau wie eine neue Frage in der
 * Lernrunde: richtig ab der Hälfte der Punkte, unsicher bei „geraten“/„unsicher“ (dann wie dort keine XP, Serie endet).
 * f = -1 (neue Frage), t = Ampel danach (gelb bei richtig, rot sonst).
 */
export const rewardArgs = (g: Pick<Graded, "punkte" | "max" | "sich">) => { const ok = g.max > 0 && g.punkte / g.max >= 0.5; return { ok, unsure: g.sich != null && g.sich <= 1, f: -1, t: ok ? 1 : 0 }; };

export type Convo = {
  id: string; thema: string; model: Model; started: number; cost: number;
  msgs: ApiMsg[];
  /** Anzeige meiner Nachrichten (Index im Verlauf → was ich geschrieben habe) */
  ui: Record<number, UserMeta>;
  /** Aufgaben dieser Sitzung (interner Schlüssel) und Zuordnung Tutor-ID → Schlüssel (falls er eine ID wiederverwendet) */
  aufgaben: Record<string, Aufgabe>; order: string[]; alias: Record<string, string>;
  offen?: string;
  bewertungen: Record<string, { b: Bewertung; xp: number; sich?: Sicher; at: number }>;
  /** je Antwort des Tutors (Index im Verlauf): welche Aufgabe sie bewertet bzw. stellt */
  rounds: Record<number, { bew?: string; auf?: string }>;
  /** tool_result zur letzten Runde – geht mit meiner nächsten Nachricht zurück */
  pending?: ToolResult;
  ende?: { fazit: string; naechstes?: string };
};
export const newConvo = (id: string, thema: string, model: Model, now: number): Convo => ({ id, thema, model, started: now, cost: 0, msgs: [], ui: {}, aufgaben: {}, order: [], alias: {}, bewertungen: {}, rounds: {} });

/** Text in Blöcke ≤ max Zeichen teilen (an Zeilengrenzen) – der Server erlaubt je Textblock höchstens 8000 Zeichen */
export function chunks(text: string, max = 7500): TextBlock[] {
  const out: string[] = []; let cur = "";
  text.split("\n").forEach((line) => {
    while (line.length > max) { if (cur) { out.push(cur); cur = ""; } out.push(line.slice(0, max)); line = line.slice(max); }
    if ((cur ? cur.length + 1 : 0) + line.length > max) { out.push(cur); cur = line; } else cur = cur ? cur + "\n" + line : line;
  });
  if (cur) out.push(cur);
  return out.filter((s) => s.trim()).map((s) => ({ type: "text", text: s }));
}

/** Meine Nachricht an den Tutor (Antwort/Rückfrage, Schlauch, Ende) – Text + Zusatzangaben klar getrennt */
export function userText(m: UserMeta, offen?: Aufgabe): string {
  const ref = offen ? ` zur offenen Aufgabe ${offen.id} („${offen.titel}“)` : "";
  const extra = [
    m.gedanke?.trim() ? `Gedankengang (Hilfe für dich, nicht Teil der Antwort): ${m.gedanke.trim().slice(0, 1500)}` : "",
    m.sich != null ? `Sicherheit: ${SICHER[m.sich]}` : "",
  ].filter(Boolean).join("\n");
  switch (m.kind) {
    case "schlauch": return `Ich stehe auf dem Schlauch${ref}. Gib mir einen kleineren Teilschritt oder ein Gerüst – nicht die Lösung.${m.text?.trim() ? `\nWo ich hänge: ${m.text.trim().slice(0, 1500)}` : ""}${extra ? "\n" + extra : ""}`;
    case "ende": return "Ich möchte die Sitzung jetzt beenden. Schließe bitte mit abschluss ab (Fazit und nächster Schritt).";
    default: return `Meine Nachricht (Antwort oder Rückfrage)${ref}:\n"""\n${(m.text ?? "").trim().slice(0, 5000)}\n"""${extra ? "\n" + extra : ""}`;
  }
}

/** Nächste Nutzer-Nachricht: offenes tool_result zuerst, dann der Text */
export function userMsg(c: Convo, blocks: TextBlock[]): ApiMsg {
  return { role: "user", content: [...(c.pending ? [c.pending] : []), ...blocks] };
}

/** Kennung einer Fehlvorstellung aus ihrem Text (wenn der Tutor keine fehl_id liefert) */
export const fvSlug = (s: string) => "fv-" + (s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "x");

export type Applied = { convo: Convo; runde: Runde | null; evidence: Ev[]; graded?: Graded; text: string };
/**
 * Antwort des Tutors verarbeiten (rein): Aufgabe merken, Bewertung zuordnen, Belege erzeugen, tool_result vorbereiten.
 * topicOf: Konzept-ID → Themen-ID. sich: Sicherheit meiner letzten Antwort (für „sicher, aber falsch“ und die XP).
 */
export function applyReply(c0: Convo, content: Block[], ids: KnownIds, topicOf: (k: string) => string | undefined, now: number, sich?: Sicher): Applied {
  const idx = c0.msgs.length;
  let c: Convo = { ...c0, msgs: [...c0.msgs, { role: "assistant", content }], pending: undefined };
  const use = content.find(isUse), text = content.filter(isText).map((b) => b.text).join("\n").trim();
  if (!use) return { convo: c, runde: null, evidence: [], text };
  const { runde, probleme } = parseRunde(use.input, ids);
  const evidence: Ev[] = []; let graded: Graded | undefined;
  const evId = (i: number | string) => `${c.id}-${use.id.slice(-10)}-${i}`.replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 64);
  if (runde) {
    // Bewertung zuerst (sie bezieht sich auf die bisher offene Aufgabe), dann ggf. die neue Aufgabe
    if (runde.bewertung) {
      const key = c.alias[runde.bewertung.aufgabe] ?? c.offen;
      const a = key ? c.aufgaben[key] : undefined;
      if (!a || !key) probleme.push(`bewertung: unbekannte Aufgabe ${runde.bewertung.aufgabe}`);
      else {
        const b = { ...runde.bewertung, max: a.punkte, punkte: Math.min(runde.bewertung.punkte, a.punkte) }; // Höchstpunkte stehen mit der Aufgabe fest
        const first = !c.bewertungen[key], w = b.max > 0 ? b.punkte / b.max : 0;
        c = { ...c, bewertungen: { ...c.bewertungen, [key]: { b, xp: c.bewertungen[key]?.xp ?? 0, ...(sich != null ? { sich } : {}), at: now } }, ...(c.offen === key ? { offen: undefined } : {}) };
        const ks = a.konzepte.length ? a.konzepte : [undefined];
        ks.forEach((k, i) => evidence.push({ id: evId("b" + i), at: now, ...(k ? { k } : {}), t: c.thema, art: "bewertung", w, p: b.punkte, m: b.max, ...(sich != null ? { sich } : {}), n: `${a.id} · ${a.titel}`.slice(0, 300), s: c.id }));
        // Sicher, aber falsch → Fehlvorstellung (auch ohne Meldung des Tutors)
        if (sich != null && sich >= 2 && w < 0.5 && !runde.graph.some((g) => g.art === "fehlvorstellung")) {
          ks.forEach((k, i) => evidence.push({ id: evId("sf" + i), at: now, ...(k ? { k } : {}), t: c.thema, art: "fehlvorstellung", w: -0.5, f: `sf-${c.id}-${key}`.replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 64), n: `Sicher, aber falsch: ${b.fehlt?.trim() || a.titel}`.slice(0, 300), s: c.id }));
        }
        graded = { key, topic: c.thema, punkte: b.punkte, max: b.max, ...(sich != null ? { sich } : {}), first };
      }
    }
    if (runde.aufgabe) {
      const tid = runde.aufgabe.id, key = c.aufgaben[tid] ? `${tid}~${c.order.length + 1}` : tid;
      c = { ...c, aufgaben: { ...c.aufgaben, [key]: runde.aufgabe }, order: [...c.order, key], alias: { ...c.alias, [tid]: key }, offen: key };
    }
    const r = { ...(graded ? { bew: graded.key } : {}), ...(runde.aufgabe ? { auf: c.offen } : {}) };
    if (r.bew || r.auf) c = { ...c, rounds: { ...c.rounds, [idx]: r } };
    runde.graph.forEach((g, i) => {
      const t = topicOf(g.konzept); if (!t) return;
      const f = g.art === "fehlvorstellung" || g.art === "behoben" ? g.fehl_id ?? (g.fehlvorstellung ? fvSlug(g.fehlvorstellung) : undefined) : undefined;
      if (g.art === "behoben" && !f) { probleme.push(`graph[${i}]: behoben braucht fehl_id`); return; }
      const n = (g.art === "fehlvorstellung" ? g.fehlvorstellung || g.notiz : g.notiz || g.fehlvorstellung)?.slice(0, 300);
      evidence.push({ id: evId("g" + i), at: now, k: g.konzept, t, art: g.art, w: g.staerke, ...(f ? { f } : {}), ...(n ? { n } : {}), s: c.id });
    });
    if (runde.abschluss) c = { ...c, ende: runde.abschluss };
  }
  const ok = !!runde && !probleme.length;
  c = { ...c, pending: { type: "tool_result", tool_use_id: use.id, content: ok ? "ok" : `Hinweise zur letzten Runde: ${probleme.join(" | ")}`.slice(0, 1500), ...(runde ? {} : { is_error: true }) } };
  return { convo: c, runde, evidence, ...(graded ? { graded } : {}), text: runde?.nachricht ?? text };
}

// ---------- Übergabe zu Beginn einer Sitzung
export type HandoffIn = {
  date: string; examDays: number; topic: { id: string; name: string; muss: boolean };
  concepts: { id: string; label: string; m: number | null; n: number; last?: string }[];
  miscon: { id: string; konzept?: string; text: string; count: number }[];
  errors: string[]; sessions: { n: number; last?: string }; fokus: string[]; inhalte: string;
};
const pc = (m: number | null) => (m == null ? "offen" : Math.round(m * 100) + " %");
export function handoff(o: HandoffIn): string {
  const L = [
    `Neue Sitzung (${o.date}). Thema: ${o.topic.id} · ${o.topic.name}${o.topic.muss ? " (Muss-Thema)" : ""}. Prüfung in ${o.examDays} Tagen.`, "",
    "Mein Stand je Konzept (ID · Name · Beherrschung · Tutor-Belege):",
    ...o.concepts.map((c) => `- ${c.id} · ${c.label} · ${pc(c.m)} · ${c.n}${c.last ? ` (zuletzt: ${c.last})` : ""}`),
  ];
  if (o.miscon.length) L.push("", "Offene Fehlvorstellungen (gezielt nachprüfen; behoben mit gleicher fehl_id melden):", ...o.miscon.map((m) => `- fehl_id ${m.id}${m.konzept ? ` (${m.konzept})` : ""}: ${m.text} (${m.count}×)`));
  if (o.errors.length) L.push("", "Häufige Fehler aus den Lernrunden zu diesem Thema:", ...o.errors.slice(0, 5).map((e) => `- ${e.replace(/\s+/g, " ").slice(0, 160)}`));
  L.push("", o.sessions.n ? `Bisherige Tutor-Sitzungen zu diesem Thema: ${o.sessions.n}${o.sessions.last ? ` (zuletzt ${o.sessions.last})` : ""}.` : "Erste Tutor-Sitzung zu diesem Thema.");
  if (o.fokus.length) L.push(`Fokus laut Lehrplan: ${o.fokus.join(", ")}.`);
  L.push("", o.inhalte, "", "Beginne jetzt: ein Satz zur Begrüßung, dann die erste Aufgabe.");
  return L.join("\n");
}

// ---------- Anzeige: Verlauf → Einträge im Chat
export type Feed =
  | { k: "start"; i: number }
  | { k: "me"; i: number; meta: UserMeta }
  | { k: "tutor"; i: number; text: string; phase?: Runde["phase"] }
  | { k: "aufgabe"; i: number; key: string; a: Aufgabe }
  | { k: "bewertung"; i: number; key: string; b: Bewertung; titel: string }
  | { k: "graph"; i: number; items: Runde["graph"] }
  | { k: "ende"; i: number; fazit: string; naechstes?: string };
/** Einträge aus dem Verlauf (die Runden werden erneut geprüft – Anzeige und Zustand nutzen dieselbe Prüfung) */
export function feedOf(c: Convo, ids: KnownIds): Feed[] {
  const out: Feed[] = [];
  c.msgs.forEach((m, i) => {
    if (m.role === "user") { const meta = c.ui[i]; out.push(!meta || meta.kind === "start" ? { k: "start", i } : { k: "me", i, meta }); return; }
    const use = m.content.find(isUse);
    if (!use) { const text = m.content.filter(isText).map((b) => b.text).join("\n").trim(); if (text) out.push({ k: "tutor", i, text }); return; }
    const { runde } = parseRunde(use.input, ids);
    if (!runde) return;
    const rd = c.rounds[i] ?? {}, bk = rd.bew, ak = rd.auf;
    // Bewertung aus dem Zustand: dort mit den festen Höchstpunkten der Aufgabe (bei Neubewertung zeigt jede Runde ihre eigene)
    if (bk && runde.bewertung && c.aufgaben[bk]) { const a = c.aufgaben[bk]; out.push({ k: "bewertung", i, key: bk, b: { ...runde.bewertung, max: a.punkte, punkte: Math.min(runde.bewertung.punkte, a.punkte) }, titel: a.titel }); }
    out.push({ k: "tutor", i, text: runde.nachricht, phase: runde.phase });
    if (ak && c.aufgaben[ak]) out.push({ k: "aufgabe", i, key: ak, a: c.aufgaben[ak] });
    if (runde.graph.length) out.push({ k: "graph", i, items: runde.graph });
    if (runde.abschluss) out.push({ k: "ende", i, fazit: runde.abschluss.fazit, ...(runde.abschluss.naechstes ? { naechstes: runde.abschluss.naechstes } : {}) });
  });
  return out;
}

// ---------- Kosten (nur Anzeige; abgerechnet wird bei Anthropic)
export type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number; cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } };
/** $ pro 1 Mio. Tokens (Stand Nov. 2026): Eingabe, Ausgabe, Cache lesen. Cache schreiben: 1,25× (5 Min.) bzw. 2× (1 Std.) Eingabe. Haiku-Cache-Lesen geschätzt. */
export const PRICE: Record<Model, { in: number; out: number; read: number }> = { sonnet: { in: 2, out: 10, read: 0.1 }, haiku: { in: 0.1, out: 0.5, read: 0.01 } };
export function costOf(model: Model, u: Usage): number {
  const p = PRICE[model], w1h = u.cache_creation?.ephemeral_1h_input_tokens, w5 = u.cache_creation?.ephemeral_5m_input_tokens;
  const write = w1h != null || w5 != null ? (w1h ?? 0) * 2 + (w5 ?? 0) * 1.25 : (u.cache_creation_input_tokens ?? 0) * 2; // ohne Aufschlüsselung: 1 Std. angenommen
  return ((u.input_tokens ?? 0) * p.in + write * p.in + (u.cache_read_input_tokens ?? 0) * p.read + (u.output_tokens ?? 0) * p.out) / 1e6;
}
/** Verlauf zu lang für eine Sitzung → beenden und neu beginnen (nie kürzen: Denk-Blöcke gelten nur im eigenen Verlauf) */
export const tooLong = (c: Convo) => c.msgs.length > 110 || JSON.stringify(c.msgs).length > 450_000;
