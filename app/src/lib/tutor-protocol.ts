/**
 * Tutor-Lernpfad (Premium) – Ablauf nach dem LearnHarness-Prinzip, eigene Umsetzung für die TAP2:
 *   1. Stand finden  – Diagnosefragen, Einschätzung je Thema (Werkzeug stand_festhalten)
 *   2. Lehrplan      – kleinster Weg vom Stand zur Prüfungsreife, aus Lernpaketen der Wissensbasis (lehrplan_setzen)
 *   3. Lernen        – Schritt für Schritt: kurz erklären, Prüffrage stellen (frage_stellen), Antwort bewerten
 *                      (antwort_bewerten), Lücke reparieren, Schritt mit Beleg abschließen (schritt_abschliessen)
 *
 * Der Tutor arbeitet nur auf der Wissensbasis des Katalogs (lib/tutor-kb.ts) und meldet alles über Werkzeuge.
 * Werkzeug-Eingaben sind Fremddaten: Zod, bekannte IDs, feste Längen. Ungültiges geht als Fehler an den Tutor zurück.
 * Reine Funktionen – der Zustand liegt in store/tutor.ts.
 */
import { z } from "zod";
import { today } from "./dates";
import type { Level } from "./graph";

// ---------- Nachrichten im Format der Claude-API
export type TextBlock = { type: "text"; text: string };
export type ToolUse = { type: "tool_use"; id: string; name: string; input: unknown };
export type ToolResult = { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };
export type Block = TextBlock | ToolUse | ToolResult;
/** Weitere Blöcke der API (z. B. thinking) – werden unverändert zurückgeschickt */
export type RawBlock = { type: string; [k: string]: unknown };
export type ApiMsg = { role: "user" | "assistant"; content: string | (Block | RawBlock)[] };
const isUse = (b: Block | RawBlock): b is ToolUse => b.type === "tool_use" && typeof b.id === "string" && typeof b.name === "string";
const isText = (b: Block | RawBlock): b is TextBlock => b.type === "text" && typeof b.text === "string";
const isResult = (b: Block | RawBlock): b is ToolResult => b.type === "tool_result" && typeof b.tool_use_id === "string";

// ---------- Zustand des Lernpfads (bleibt auf dem Gerät)
export type Step = { id: string; titel: string; thema: string; pakete: string[]; ziel: string; nach: string[]; status: "offen" | "aktiv" | "fertig"; beleg?: string };
export type Evidence = { at: string; thema: string; schritt?: string; punkte: number; max: number; art: "auswahl" | "frei" };
export type Insight = { at: string; thema: string; aussage: string; kern?: string };
export type Pfad = {
  v: 1; ziel: string;
  standFertig: boolean;
  stand: Record<string, { stufe: Level; notiz?: string; at: string }>;
  plan: Step[];
  evidence: Evidence[];
  insights: Insight[];
  miscon: Insight[];
};
export const emptyPfad = (): Pfad => ({ v: 1, ziel: "", standFertig: false, stand: {}, plan: [], evidence: [], insights: [], miscon: [] });
export type Phase = "stand" | "plan" | "lernen" | "fertig";
export function phaseOf(p: Pfad): Phase {
  if (!p.standFertig && !p.plan.length) return "stand";
  if (!p.plan.length) return "plan";
  return p.plan.every((s) => s.status === "fertig") ? "fertig" : "lernen";
}
/** Reife je Thema aus den Tutor-Antworten (letzte 8, neuere zählen mehr) – fließt in den Wissensgraphen ein */
export function tutorPct(p: Pfad, thema: string): number | null {
  const ev = p.evidence.filter((e) => e.thema === thema && e.max > 0).slice(-8);
  if (!ev.length) return null;
  let w = 0, s = 0; ev.forEach((e, i) => { const k = i + 1; w += k; s += k * Math.min(1, e.punkte / e.max); });
  return s / w;
}

// ---------- Werkzeuge (JSON-Schema für die Claude-API)
const str = (d: string, max = 300) => ({ type: "string", description: d, maxLength: max });
export const TOOLS = [
  {
    name: "stand_festhalten",
    description: "Hält deine Einschätzung des Lernstands je Thema fest (Diagnose und jederzeit, wenn du etwas Neues weißt). Setze diagnose_fertig auf true, sobald du genug weißt, um den Lehrplan zu erstellen.",
    input_schema: { type: "object", properties: {
      themen: { type: "array", maxItems: 20, items: { type: "object", properties: { thema: str("Themen-ID, z. B. T05", 10), stufe: { type: "string", enum: ["stark", "festigen", "schwach", "offen"] }, notiz: str("kurz: was sitzt, was fehlt", 200) }, required: ["thema", "stufe"] } },
      diagnose_fertig: { type: "boolean" },
    }, required: ["themen"] },
  },
  {
    name: "lehrplan_setzen",
    description: "Setzt den Lehrplan: die kleinste Folge von Schritten vom aktuellen Stand zur Prüfungsreife, nur aus Lernpaketen der Wissensbasis. Ersetzt einen bestehenden Plan (fertige Schritte mit gleicher ID bleiben fertig).",
    input_schema: { type: "object", properties: {
      ziel: str("Ziel in einem Satz", 200),
      schritte: { type: "array", minItems: 1, maxItems: 12, items: { type: "object", properties: {
        id: str("kurze, stabile Kennung, z. B. sql-joins", 40), titel: str("kurzer Titel", 80), thema: str("Themen-ID", 10),
        pakete: { type: "array", items: str("Lernpaket-ID, z. B. P05", 10), minItems: 1, maxItems: 4 },
        ziel: str("was ich danach sicher kann", 200), nach: { type: "array", items: str("ID eines vorherigen Schritts", 40), maxItems: 4 },
      }, required: ["id", "titel", "thema", "pakete", "ziel"] } },
    }, required: ["ziel", "schritte"] },
  },
  {
    name: "frage_stellen",
    description: "Stellt mir genau eine Frage und wartet auf meine Antwort (Diagnose oder Prüffrage zu einem Schritt). Auswahlfragen: 3–4 Optionen, genau eine richtig. Freie Fragen: im IHK-Stil mit Operator und Punkten.",
    input_schema: { type: "object", properties: {
      thema: str("Themen-ID", 10), schritt: str("ID des Lehrplan-Schritts, falls vorhanden", 40),
      art: { type: "string", enum: ["auswahl", "frei"] },
      frage: str("Fragetext", 1500), kontext: str("optional: Situation/Fallbeispiel", 1500),
      optionen: { type: "array", items: str("Option", 300), minItems: 3, maxItems: 4 },
      richtig: { type: "integer", minimum: 0, maximum: 3, description: "Index der richtigen Option (nur Auswahl)" },
      operator: str("z. B. Nennen, Erläutern, Beurteilen", 30), punkte: { type: "integer", minimum: 1, maximum: 20 },
      kern: { type: "array", items: str("ID der geprüften Kernaussage, z. B. P05.2", 12), maxItems: 4 },
    }, required: ["thema", "art", "frage"] },
  },
  {
    name: "antwort_bewerten",
    description: "Bewertet meine freie Antwort wie ein IHK-Prüfer (Punkte je Aspekt, Operator beachten). Danach gibst du kurz Rückmeldung im Text.",
    input_schema: { type: "object", properties: {
      thema: str("Themen-ID", 10), punkte: { type: "number", minimum: 0, maximum: 20 }, max: { type: "number", minimum: 1, maximum: 20 },
      fehlvorstellung: str("optional: konkrete Fehlvorstellung, die ich habe", 300),
    }, required: ["thema", "punkte", "max"] },
  },
  {
    name: "schritt_abschliessen",
    description: "Schließt einen Lehrplan-Schritt ab, wenn ich ihn nachweislich verstanden habe – mit Beleg aus meinen eigenen Antworten.",
    input_schema: { type: "object", properties: {
      schritt: str("ID des Schritts", 40), beleg: str("kurz: woran man sieht, dass ich es kann", 300),
      verstanden: { type: "array", maxItems: 4, items: { type: "object", properties: { aussage: str("was ich jetzt kann", 200), kern: str("Kernaussage-ID", 12) }, required: ["aussage"] } },
    }, required: ["schritt", "beleg"] },
  },
] as const;
export const TOOL_NAMES = TOOLS.map((t) => t.name);

// ---------- Anweisungen (eigene Fassung des Vorgehens)
export const SYSTEM = `Du bist mein persönlicher Tutor für die IHK-Abschlussprüfung Teil 2, Fachinformatiker Anwendungsentwicklung (FIAE). Du sprichst Deutsch, duzt mich und bist klar, freundlich und knapp.

Grundlage: Du arbeitest ausschließlich mit der Wissensbasis unten (Themen T…, Lernpakete P…, Kernaussagen P….n). Erfinde keine Inhalte außerhalb davon. IDs gehören nur in Werkzeug-Aufrufe, im Text nennst du Themen beim Namen.

Ablauf:
1. Stand finden: Lies die Übergabe (mein Lernstand aus der App). Stelle 3–6 kurze Diagnosefragen mit frage_stellen – vor allem zu Pflichtthemen, die schwach oder offen sind, und zu Themen, bei denen der Lernstand unsicher ist. Halte nach jeder Antwort deine Einschätzung mit stand_festhalten fest. Wenn du genug weißt: stand_festhalten mit diagnose_fertig = true.
2. Lehrplan: Erstelle mit lehrplan_setzen den kleinsten Weg zur Prüfungsreife: 4–8 Schritte, Abhängigkeiten zuerst, Pflichtthemen und meine Lücken vorn, nichts, was ich schon sicher kann. Erkläre den Plan in 2–3 Sätzen.
3. Lernen: Arbeite den Plan Schritt für Schritt ab. In jedem Schritt: einen Gedankenschritt kurz und anschaulich erklären (an das anknüpfen, was ich schon kann; Beispiel aus der Prüfungspraxis), dann sofort eine Prüffrage mit frage_stellen. Nie mehrere Erklärschritte ohne Prüffrage. Bei freien Antworten zuerst antwort_bewerten, dann kurz Rückmeldung. Ist etwas nicht angekommen: genau diese Lücke reparieren und neu prüfen, bevor es weitergeht. Sitzt der Schritt (mindestens zwei sichere Antworten), schließe ihn mit schritt_abschliessen ab und beginne den nächsten.

Regeln:
- Immer genau eine Frage gleichzeitig. Nach frage_stellen hörst du auf und wartest auf meine Antwort.
- Fragen im IHK-Stil, passend zu meinen Lücken; Auswahlfragen mit plausiblen Ablenkern, freie Fragen mit Operator und Punkten. Verrate die Lösung nicht in der Frage.
- Ich kann laut denken und angeben, wie sicher ich bin. Nutze das: Unsicher richtig heißt noch nicht sicher.
- Texte kurz halten (höchstens etwa 120 Wörter), keine Meta-Erklärungen zum Ablauf.
- Stelle ich zwischendurch eine eigene Frage, beantworte sie knapp aus der Wissensbasis und kehre dann zum Plan zurück.`;

// ---------- Werkzeug-Eingaben prüfen
const sid = z.string().trim().min(1).max(40), txt = (n: number) => z.string().trim().min(1).max(n);
const Z = {
  stand_festhalten: z.object({ themen: z.array(z.object({ thema: z.string(), stufe: z.enum(["stark", "festigen", "schwach", "offen"]), notiz: z.string().trim().max(200).optional() })).max(20), diagnose_fertig: z.boolean().optional() }),
  lehrplan_setzen: z.object({ ziel: txt(200), schritte: z.array(z.object({ id: sid, titel: txt(80), thema: z.string(), pakete: z.array(z.string()).min(1).max(4), ziel: txt(200), nach: z.array(z.string()).max(4).optional() })).min(1).max(12) }),
  frage_stellen: z.object({ thema: z.string(), schritt: z.string().max(40).optional(), art: z.enum(["auswahl", "frei"]), frage: txt(1500), kontext: z.string().trim().max(1500).optional(), optionen: z.array(txt(300)).min(3).max(4).optional(), richtig: z.number().int().min(0).max(3).optional(), operator: z.string().trim().max(30).optional(), punkte: z.number().int().min(1).max(20).optional(), kern: z.array(z.string()).max(4).optional() }),
  antwort_bewerten: z.object({ thema: z.string(), punkte: z.number().min(0).max(20), max: z.number().min(1).max(20), fehlvorstellung: z.string().trim().max(300).optional() }),
  schritt_abschliessen: z.object({ schritt: sid, beleg: txt(300), verstanden: z.array(z.object({ aussage: txt(200), kern: z.string().max(12).optional() })).max(4).optional() }),
};
export type Question = z.infer<typeof Z.frage_stellen> & { toolId: string };
export type Ids = { topics: Set<string>; pakete: Set<string>; kern: Set<string> };

/** Frage aus einem Werkzeug-Aufruf (geprüft); null, wenn ungültig */
export function parseQuestion(t: ToolUse, ids: Ids): Question | null {
  if (t.name !== "frage_stellen") return null;
  const r = Z.frage_stellen.safeParse(t.input);
  if (!r.success || !ids.topics.has(r.data.thema)) return null;
  const q = r.data;
  if (q.art === "auswahl" && (!q.optionen || q.richtig == null || q.richtig >= q.optionen.length)) return null;
  return { ...q, kern: q.kern?.filter((k) => ids.kern.has(k)), toolId: t.id };
}

/** Ergebnis eines Werkzeug-Aufrufs: neuer Pfad, Antwort an den Tutor, ggf. Frage und Bewertung (für XP) */
export type Applied = { pfad: Pfad; result?: ToolResult; question?: Question; graded?: { thema: string; punkte: number; max: number } };
const ok = (id: string, content = "ok"): ToolResult => ({ type: "tool_result", tool_use_id: id, content });
const err = (id: string, content: string): ToolResult => ({ type: "tool_result", tool_use_id: id, content, is_error: true });

export function applyTool(p: Pfad, t: ToolUse, ids: Ids, lastSchritt?: string): Applied {
  const at = today();
  switch (t.name) {
    case "stand_festhalten": {
      const r = Z.stand_festhalten.safeParse(t.input); if (!r.success) return { pfad: p, result: err(t.id, "Ungültige Eingabe.") };
      const bad = r.data.themen.filter((x) => !ids.topics.has(x.thema)).map((x) => x.thema);
      const stand = { ...p.stand }; r.data.themen.filter((x) => ids.topics.has(x.thema)).forEach((x) => { stand[x.thema] = { stufe: x.stufe, ...(x.notiz ? { notiz: x.notiz } : {}), at }; });
      return { pfad: { ...p, stand, standFertig: p.standFertig || !!r.data.diagnose_fertig }, result: bad.length ? err(t.id, "Unbekannte Themen: " + bad.join(", ")) : ok(t.id) };
    }
    case "lehrplan_setzen": {
      const r = Z.lehrplan_setzen.safeParse(t.input); if (!r.success) return { pfad: p, result: err(t.id, "Ungültiger Lehrplan.") };
      const bad = r.data.schritte.flatMap((s) => [ids.topics.has(s.thema) ? null : s.thema, ...s.pakete.filter((x) => !ids.pakete.has(x))]).filter(Boolean);
      if (bad.length) return { pfad: p, result: err(t.id, "Unbekannte IDs: " + bad.join(", ") + ". Nur IDs aus der Wissensbasis.") };
      const done = new Map(p.plan.filter((s) => s.status === "fertig").map((s) => [s.id, s]));
      const seen = new Set<string>();
      const plan: Step[] = r.data.schritte.filter((s) => !seen.has(s.id) && seen.add(s.id)).map((s) => ({ id: s.id, titel: s.titel, thema: s.thema, pakete: s.pakete, ziel: s.ziel, nach: (s.nach ?? []).filter((n) => seen.has(n) && n !== s.id), status: done.has(s.id) ? "fertig" : "offen", ...(done.get(s.id)?.beleg ? { beleg: done.get(s.id)!.beleg } : {}) }));
      const first = plan.find((s) => s.status !== "fertig"); if (first) first.status = "aktiv";
      return { pfad: { ...p, ziel: r.data.ziel, standFertig: true, plan }, result: ok(t.id, `Lehrplan gespeichert (${plan.length} Schritte). Beginne jetzt mit „${first?.titel ?? "—"}“.`) };
    }
    case "frage_stellen": {
      const q = parseQuestion(t, ids);
      if (!q) return { pfad: p, result: err(t.id, "Ungültige Frage (Thema-ID, bei Auswahl 3–4 Optionen und richtig-Index angeben).") };
      // Schritt aktiv setzen, wenn der Tutor mit einem neuen Schritt beginnt
      const plan = q.schritt && p.plan.some((s) => s.id === q.schritt && s.status === "offen")
        ? p.plan.map((s) => (s.id === q.schritt ? { ...s, status: "aktiv" as const } : s.status === "aktiv" ? { ...s, status: "offen" as const } : s))
        : p.plan;
      return { pfad: { ...p, plan }, question: q }; // Antwort kommt vom Lernenden
    }
    case "antwort_bewerten": {
      const r = Z.antwort_bewerten.safeParse(t.input); if (!r.success || !ids.topics.has(r.data.thema)) return { pfad: p, result: err(t.id, "Ungültige Bewertung.") };
      const punkte = Math.min(r.data.punkte, r.data.max), e: Evidence = { at, thema: r.data.thema, ...(lastSchritt ? { schritt: lastSchritt } : {}), punkte, max: r.data.max, art: "frei" };
      const miscon = r.data.fehlvorstellung ? [...p.miscon, { at, thema: r.data.thema, aussage: r.data.fehlvorstellung }].slice(-40) : p.miscon;
      return { pfad: { ...p, evidence: [...p.evidence, e].slice(-400), miscon }, result: ok(t.id), graded: { thema: r.data.thema, punkte, max: r.data.max } };
    }
    case "schritt_abschliessen": {
      const r = Z.schritt_abschliessen.safeParse(t.input); if (!r.success) return { pfad: p, result: err(t.id, "Ungültige Eingabe.") };
      const s = p.plan.find((x) => x.id === r.data.schritt); if (!s) return { pfad: p, result: err(t.id, "Unbekannter Schritt.") };
      let plan = p.plan.map((x) => (x.id === s.id ? { ...x, status: "fertig" as const, beleg: r.data.beleg } : x));
      const next = plan.find((x) => x.status === "aktiv") ?? plan.find((x) => x.status === "offen");
      if (next && next.status === "offen") plan = plan.map((x) => (x.id === next.id ? { ...x, status: "aktiv" as const } : x));
      const insights = [...p.insights, ...(r.data.verstanden ?? []).map((v) => ({ at, thema: s.thema, aussage: v.aussage, ...(v.kern && ids.kern.has(v.kern) ? { kern: v.kern } : {}) }))].slice(-100);
      return { pfad: { ...p, plan, insights }, result: ok(t.id, next ? `Schritt abgeschlossen. Weiter mit „${next.titel}“.` : "Alle Schritte abgeschlossen. Fasse kurz zusammen und schlage Wiederholung vor.") };
    }
    default: return { pfad: p, result: err(t.id, "Unbekanntes Werkzeug.") };
  }
}

/** Antwort auf eine Frage als Werkzeug-Ergebnis; bei Auswahl bewertet die App selbst */
export type Answer = { wahl?: number; text?: string; sicher: "unsicher" | "eher" | "sicher"; denken?: string; weissNicht?: boolean };
export const SICHER_LBL = { unsicher: "unsicher", eher: "eher sicher", sicher: "sicher" } as const;
export function answerResult(q: Question, a: Answer): { result: ToolResult; correct?: boolean } {
  const tail = `\nSicherheit: ${SICHER_LBL[a.sicher]}.${a.denken?.trim() ? `\nMeine Gedanken: ${a.denken.trim().slice(0, 1500)}` : ""}`;
  if (a.weissNicht) return { result: ok(q.toolId, "Ich weiß es nicht." + tail), correct: q.art === "auswahl" ? false : undefined };
  if (q.art === "auswahl") {
    const L = "ABCD", w = a.wahl ?? -1, correct = w === q.richtig;
    return { result: ok(q.toolId, `Ich wähle ${L[w] ?? "?"}: ${q.optionen?.[w] ?? ""} – ${correct ? "richtig" : `falsch (richtig ist ${L[q.richtig!]})`}.` + tail), correct };
  }
  return { result: ok(q.toolId, "Meine Antwort: " + (a.text ?? "").trim().slice(0, 4000) + tail) };
}

/** Antwort des Tutors verarbeiten: Werkzeuge der Reihe nach anwenden. Höchstens eine offene Frage – weitere gehen als
 *  Fehler zurück. results = Antworten an den Tutor (gehen mit der nächsten Nachricht in einer user-Nachricht zurück). */
export type Reply = { pfad: Pfad; question: Question | null; results: ToolResult[]; graded: NonNullable<Applied["graded"]>[]; schritt?: string };
export function processReply(p: Pfad, content: (Block | RawBlock)[], ids: Ids, schritt?: string): Reply {
  const out: Reply = { pfad: p, question: null, results: [], graded: [], schritt };
  content.filter(isUse).forEach((t) => {
    if (t.name === "frage_stellen" && out.question) { out.results.push(err(t.id, "Nur eine Frage gleichzeitig – diese wurde nicht gestellt.")); return; }
    const a = applyTool(out.pfad, t, ids, out.schritt);
    out.pfad = a.pfad;
    if (a.result) out.results.push(a.result);
    if (a.graded) out.graded.push(a.graded);
    if (a.question) { out.question = a.question; if (a.question.schritt) out.schritt = a.question.schritt; }
  });
  return out;
}

/** Verlauf zu lang → neues Gespräch mit Übergabe (nie kürzen: Denk-Blöcke gelten nur im Gespräch, das sie erzeugt hat) */
export const tooLong = (msgs: ApiMsg[]) => msgs.length > 100 || JSON.stringify(msgs).length > 300_000;
/** Nutzerblöcke als Text (für den Neustart nach einer Übergabe) */
export const asText = (blocks: (Block | RawBlock)[]) => blocks.map((b) => (isText(b) ? b.text : isResult(b) ? b.content : "")).filter(Boolean).join("\n\n");

// ---------- Anzeige: Verlauf → Karten im Chat
export type Feed =
  | { k: "start"; i: number }
  | { k: "me"; i: number; text: string }
  | { k: "tutor"; i: number; text: string }
  | { k: "frage"; i: number; q: Question; antwort?: string }
  | { k: "plan"; i: number; ziel: string; n: number }
  | { k: "stand"; i: number; n: number; fertig: boolean }
  | { k: "bewertung"; i: number; thema: string; punkte: number; max: number; fehl?: string }
  | { k: "schritt"; i: number; id: string; beleg: string };
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
export function feedOf(msgs: ApiMsg[], ids: Ids, queued: ToolResult[] = []): Feed[] {
  const out: Feed[] = [], answers = new Map<string, ToolResult>();
  msgs.forEach((m) => { if (m.role === "user" && Array.isArray(m.content)) m.content.filter(isResult).forEach((r) => answers.set(r.tool_use_id, r)); });
  queued.forEach((r) => { if (!answers.has(r.tool_use_id)) answers.set(r.tool_use_id, { ...r, content: "" }); }); // noch nicht gesendet
  msgs.forEach((m, i) => {
    if (typeof m.content === "string") { out.push(i === 0 && m.role === "user" ? { k: "start", i } : { k: m.role === "user" ? "me" : "tutor", i, text: m.content }); return; }
    if (m.role === "user") { m.content.filter(isText).forEach((b) => { if (b.text.startsWith("Übergabe aus dem TAP2-Coach")) out.push({ k: "start", i }); else out.push({ k: "me", i, text: b.text }); }); return; }
    m.content.forEach((b) => {
      if (isText(b)) { if (b.text.trim()) out.push({ k: "tutor", i, text: b.text }); return; }
      if (!isUse(b)) return;
      // Ergebnis noch nicht gesendet (wartet bis zur nächsten Nachricht) zählt als gültig; Fehler werden nicht gezeigt
      const x = rec(b.input), r = answers.get(b.id), res = r?.content || undefined, valid = !r?.is_error;
      if (b.name === "frage_stellen") { const q = parseQuestion(b, ids); if (q) out.push({ k: "frage", i, q, ...(res ? { antwort: res } : {}) }); }
      else if (b.name === "lehrplan_setzen" && valid) out.push({ k: "plan", i, ziel: String(x.ziel ?? ""), n: Array.isArray(x.schritte) ? x.schritte.length : 0 });
      else if (b.name === "stand_festhalten") out.push({ k: "stand", i, n: Array.isArray(x.themen) ? x.themen.length : 0, fertig: !!x.diagnose_fertig });
      else if (b.name === "antwort_bewerten" && ids.topics.has(String(x.thema))) out.push({ k: "bewertung", i, thema: String(x.thema), punkte: Math.min(Number(x.punkte) || 0, Number(x.max) || 1), max: Number(x.max) || 1, ...(x.fehlvorstellung ? { fehl: String(x.fehlvorstellung) } : {}) });
      else if (b.name === "schritt_abschliessen" && valid) out.push({ k: "schritt", i, id: String(x.schritt ?? ""), beleg: String(x.beleg ?? "") });
    });
  });
  return out;
}

/** Übergabe an den Tutor: Lernstand aus der App und bisheriger Lernpfad */
export function handoff(o: { examDays: number; topics: { id: string; name: string; muss: boolean; pct: number; level: Level; rot: number; neu: number; tutor: number | null }[]; errors: { topic: string; q: string; wrong: number }[]; pfad: Pfad }): string {
  const pct = (n: number) => Math.round(n * 100) + " %", p = o.pfad;
  const lines = [
    `Übergabe aus dem TAP2-Coach (${today()}). Prüfung in ${o.examDays} Tagen.`, "",
    "Lernstand je Thema aus den Lernrunden (ID · Name · Reife · Einordnung · rot/neu · Tutor-Reife):",
    ...o.topics.map((t) => `- ${t.id} · ${t.name}${t.muss ? " · Pflicht" : ""} · ${pct(t.pct)} · ${t.level} · ${t.rot} rot / ${t.neu} neu${t.tutor != null ? ` · Tutor ${pct(t.tutor)}` : ""}`),
  ];
  if (o.errors.length) lines.push("", "Häufigste Fehler:", ...o.errors.slice(0, 6).map((e) => `- [${e.topic}] ${e.q.replace(/\s+/g, " ").slice(0, 160)} (${e.wrong}× falsch)`));
  const st = Object.entries(p.stand);
  if (st.length) lines.push("", "Deine bisherige Einschätzung:", ...st.map(([k, v]) => `- ${k}: ${v.stufe}${v.notiz ? " – " + v.notiz : ""}`));
  if (p.plan.length) {
    lines.push("", `Bestehender Lehrplan (Ziel: ${p.ziel}):`, ...p.plan.map((s) => `- [${s.status}] ${s.id} · ${s.titel} (${s.thema}; ${s.pakete.join(", ")})`));
    lines.push("", "Mach mit dem aktiven Schritt weiter: kurz anknüpfen, dann Prüffrage.");
  } else lines.push("", p.standFertig ? "Die Diagnose ist abgeschlossen. Erstelle jetzt den Lehrplan." : "Beginne mit der Diagnose.");
  if (p.insights.length) lines.push("", "Belegt verstanden:", ...p.insights.slice(-8).map((i) => `- [${i.thema}] ${i.aussage}`));
  return lines.join("\n");
}
