/**
 * Tutor (Premium, vorerst nur Admin): Lernpfad und Gespräch.
 *
 * - Lernpfad (Stand je Thema, Lehrplan, Belege, Erkenntnisse) bleibt auf diesem Gerät (localStorage, eigener
 *   Schlüssel) – das Format des Lernstands (v7) bleibt unverändert. Er fließt in den Wissensgraphen ein.
 * - Gespräch: Nachrichten im Format der Claude-API, werden nur angehängt (nie gekürzt, Denk-Blöcke unverändert).
 *   Wird es zu lang, beginnt ein neues Gespräch mit einer Übergabe (Lernstand + Lernpfad).
 * - Antworten zählen: XP und Quests über das Belohnungs-Modul (gm.answer), dazu die Tagesstatistik (S.log).
 * Ablauf und Werkzeuge: lib/tutor-protocol.ts, Wissensbasis: lib/tutor-kb.ts.
 */
import { create } from "zustand";
import { TAP2 } from "@/content/catalog";
import { supabase } from "@/lib/supabase";
import { kbDetail, kbIds, kbOverview, makeKb } from "@/lib/tutor-kb";
import { SYSTEM, TOOLS, answerResult, asText, emptyPfad, processReply, tooLong, type Answer, type ApiMsg, type Block, type Pfad, type Question, type RawBlock, type ToolResult } from "@/lib/tutor-protocol";
import { today } from "@/lib/dates";
import { gm } from "./gami";
import { useProgress } from "./progress";

/** Tutor freigeschaltet auf diesem Gerät (/tutor?premium=1) – zeigt den Menüpunkt; der Server prüft zusätzlich die Admin-Rolle */
export const PREMIUM_KEY = "tap2coach-premium";
export const isPremium = () => { try { return localStorage.getItem(PREMIUM_KEY) === "1"; } catch { return false; } };

const KEY_PFAD = "tap2coach-tutor-pfad", KEY_CHAT = "tap2coach-tutor-gespraech";
const read = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat oder voll */ } };

export const KB = makeKb(TAP2), IDS = kbIds(KB);
// System-Teil: Anweisungen + ganze Wissensbasis. Fest (gleich für jede Anfrage), damit Prompt-Caching greift.
let sys = "";
export const tutorSystem = () => (sys ||= `${SYSTEM}\n\n${kbOverview(KB)}\n\n${kbDetail(KB, [...KB.pakete.keys()])}`);

export type Model = "haiku" | "sonnet";
type Meta = { wahl?: number; correct?: boolean; sicher: Answer["sicher"]; weissNicht?: boolean };
export type Convo = {
  model: Model; msgs: ApiMsg[]; cost: number;
  /** offene Frage (wartet auf Antwort) und Werkzeug-Ergebnisse, die mit der nächsten Nachricht zurückgehen */
  pending: Question | null; queued: ToolResult[];
  schritt?: string; meta: Record<string, Meta>;
};
const emptyConvo = (model: Model = "haiku"): Convo => ({ model, msgs: [], cost: 0, pending: null, queued: [], meta: {} });

export type SideTab = "plan" | "stand" | "frage";
type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
// Preise pro 1 Mio. Tokens (Anfang Nov. 2026) – nur für die Kostenanzeige, abgerechnet wird bei Anthropic
const PRICE = { haiku: { in: 0.1, out: 0.5 }, sonnet: { in: 2, out: 10 } } as const;

type Store = {
  pfad: Pfad; convo: Convo; busy: boolean; err: string; tab: SideTab;
  setTab: (t: SideTab) => void;
  setModel: (m: Model) => void;
  /** Neues Gespräch mit Übergabe beginnen (Lernpfad bleibt) */
  start: (handoff: string) => Promise<void>;
  /** Eigene Nachricht (Rückfrage); bei offener Frage geht sie als „noch keine Antwort“ mit. false = nicht gesendet */
  send: (text: string, handoff: () => string) => Promise<boolean>;
  /** Antwort auf die offene Frage */
  answer: (a: Answer, handoff: () => string) => Promise<boolean>;
  /** Gespräch beenden; mit all = true auch den Lernpfad löschen */
  reset: (all?: boolean) => void;
};

/** Belohnung und Tagesstatistik für eine bewertete Antwort */
function reward(thema: string, ok: boolean, unsure: boolean) {
  gm.answer({ id: "tutor:" + thema, topic: thema }, ok, unsure, 1, 1);
}

export const useTutor = create<Store>((set, get) => {
  const save = (pfad: Pfad, convo: Convo) => { write(KEY_PFAD, pfad); write(KEY_CHAT, convo); set({ pfad, convo }); };

  async function call(model: Model, msgs: ApiMsg[]): Promise<{ content: (Block | RawBlock)[]; usage: Usage; stop: string }> {
    if (!supabase) throw new Error("Der Tutor braucht den Server (Supabase).");
    const { data, error } = await supabase.functions.invoke("tutor", { body: { model, system: tutorSystem(), tools: TOOLS, messages: msgs } });
    if (error) { const ctx = (error as { context?: Response }).context; const j = ctx ? await ctx.json().catch(() => null) : null; throw new Error(j?.error ?? "Der Tutor ist gerade nicht erreichbar."); }
    if (!Array.isArray(data?.content) || data.stop === "refusal") throw new Error(String(data?.text || "Keine Antwort erhalten."));
    return { content: data.content, usage: data.usage ?? {}, stop: String(data.stop ?? "") };
  }

  /** Nutzer-Nachricht senden und Werkzeuge ausführen, bis der Tutor fragt oder fertig ist (höchstens 5 Runden) */
  async function run(userContent: (Block | RawBlock)[], base: Convo): Promise<boolean> {
    set({ busy: true, err: "" });
    let pfad = get().pfad, c: Convo = { ...base, pending: null, queued: [], msgs: [...base.msgs, { role: "user", content: userContent }] };
    try {
      for (let n = 0; n < 5; n++) {
        let r;
        try { r = await call(c.model, c.msgs); }
        catch (e) {
          if (n === 0) throw e;
          // Spätere Runde: Werkzeug-Ergebnisse aufheben, sie gehen mit der nächsten Nachricht mit
          const last = c.msgs[c.msgs.length - 1];
          c = { ...c, msgs: c.msgs.slice(0, -1), queued: Array.isArray(last.content) ? (last.content as ToolResult[]) : [] };
          save(pfad, c); set({ err: e instanceof Error ? e.message : "Fehler." }); return true;
        }
        const u = r.usage, p = PRICE[c.model];
        const cost = c.cost + ((u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1) / 1e6 * p.in + (u.output_tokens ?? 0) / 1e6 * p.out;
        const rep = processReply(pfad, r.content, IDS, c.schritt);
        pfad = rep.pfad;
        // Freie Antwort bewertet → XP (richtig ab der Hälfte der Punkte; Sicherheit aus der Antwort)
        rep.graded.forEach((g) => { const m = c.meta[lastFree(c) ?? ""]; reward(g.thema, g.punkte / g.max >= 0.5, m ? m.sicher !== "sicher" : false); });
        c = { ...c, cost, schritt: rep.schritt, msgs: [...c.msgs, { role: "assistant", content: r.content }] };
        if (rep.question) { c = { ...c, pending: rep.question, queued: rep.results }; break; }
        if (rep.results.length && r.stop === "tool_use") {
          if (n === 4) { c = { ...c, queued: rep.results }; break; }
          c = { ...c, msgs: [...c.msgs, { role: "user", content: rep.results }] };
          save(pfad, c); continue;
        }
        if (rep.results.length) c = { ...c, queued: rep.results };
        break;
      }
      save(pfad, c); return true;
    } catch (e) { set({ err: e instanceof Error ? e.message : "Fehler." }); return false; }
    finally { set({ busy: false }); }
  }
  /** Letzte beantwortete freie Frage (für die Sicherheit bei der Bewertung) */
  const lastFree = (c: Convo) => Object.keys(c.meta).reverse().find((k) => c.meta[k] && c.meta[k].wahl === undefined);

  /** Zu langes Gespräch: neu mit Übergabe beginnen, die Nutzerblöcke gehen als Text mit */
  const fresh = (c: Convo, blocks: (Block | RawBlock)[], handoff: () => string): [(Block | RawBlock)[], Convo] =>
    tooLong(c.msgs) ? [[{ type: "text", text: handoff() + "\n\nWeiter im Gespräch. Meine letzte Nachricht:\n" + asText(blocks) }], { ...emptyConvo(c.model), cost: c.cost, meta: c.meta }] : [blocks, c];

  return {
    pfad: read<Pfad>(KEY_PFAD, emptyPfad()),
    convo: read<Convo>(KEY_CHAT, emptyConvo()),
    busy: false, err: "", tab: "plan",
    setTab: (tab) => set({ tab }),
    setModel: (model) => { const c = { ...get().convo, model }; save(get().pfad, c); },
    start: async (handoff) => { if (get().busy) return; await run([{ type: "text", text: handoff }], emptyConvo(get().convo.model)); },
    send: async (text, handoff) => {
      const t = text.trim().slice(0, 6000), c = get().convo;
      if (!t || get().busy || !c.msgs.length) return false;
      const open: ToolResult[] = c.pending ? [{ type: "tool_result", tool_use_id: c.pending.toolId, content: "Noch keine Antwort – ich habe erst eine Rückfrage." }] : [];
      const [blocks, base] = fresh(c, [...c.queued, ...open, { type: "text", text: t }], handoff);
      return run(blocks, base);
    },
    answer: async (a, handoff) => {
      const c = get().convo, q = c.pending;
      if (!q || get().busy) return false;
      const { result, correct } = answerResult(q, a);
      const meta: Meta = { sicher: a.sicher, ...(a.wahl !== undefined ? { wahl: a.wahl } : {}), ...(correct !== undefined ? { correct } : {}), ...(a.weissNicht ? { weissNicht: true } : {}) };
      const c2 = { ...c, meta: { ...c.meta, [q.toolId]: meta } };
      const [blocks, base] = fresh(c2, [...c.queued, result], handoff);
      const ok = await run(blocks, base);
      if (ok) {
        // Jede Antwort zählt in die Tagesstatistik; Auswahlfragen bewertet die App selbst (XP + Beleg im Lernpfad)
        useProgress.getState().logTutor();
        if (q.art === "auswahl") {
          reward(q.thema, !!correct, a.sicher !== "sicher");
          const p = get().pfad, ev = { at: today(), thema: q.thema, ...(q.schritt ? { schritt: q.schritt } : {}), punkte: correct ? 1 : 0, max: 1, art: "auswahl" as const };
          save({ ...p, evidence: [...p.evidence, ev].slice(-400) }, get().convo);
        } // freie Antworten: XP, sobald der Tutor bewertet (antwort_bewerten)
      }
      return ok;
    },
    reset: (all) => { const c = emptyConvo(get().convo.model); save(all ? emptyPfad() : get().pfad, c); set({ err: "" }); },
  };
});
