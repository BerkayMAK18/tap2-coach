/**
 * Prüfer-Tutor (Premium, vorerst nur Admin): Sitzung, Tutor-Stand, XP und Abgleich.
 *
 * - Sitzung (tap2coach-tutor-sitzung, nur dieses Gerät): Verlauf im Format der Claude-API, nur angehängt.
 * - Tutor-Stand (tap2coach-tutor-stand): Belege, Fehlvorstellungen, Sitzungen, Tutor-XP je Tag – im Konto auf allen
 *   angemeldeten Geräten (lib/tutor-sync.ts, Tabelle app_tutor_state, der Login reicht). Nicht im Paket tap2_sync.
 * - Belohnung: Jede bewertete Aufgabe zählt einmal genau wie eine normale Antwort (gm.answer): XP mit Combo-Bonus und
 *   Trank, Federn, Serie, Tagesquests und Tagesstatistik (S.log). „Richtig“ = mindestens die Hälfte der Punkte,
 *   „unsicher“ = als geraten/unsicher markiert (dann wie bei Lernrunden keine XP). Keine Tagesobergrenze.
 * Reine Logik: lib/tutor-session.ts, lib/tutor-schema.ts, lib/tutor-state.ts.
 */
import { create } from "zustand";
import { TAP2 } from "@/content/catalog";
import { today } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { kbIds, kbOverview, makeKb } from "@/lib/tutor-kb";
import { applyReply, chunks, rewardArgs, costOf, newConvo, tooLong, userMsg, userText, type Block, type Convo, type Model, type Sicher, type UserMeta } from "@/lib/tutor-session";
import { EPOCH, addEvidence, addXpDay, emptyTutor, mergeTutor, normalizeTutor, putSession, resetTutor, type TutorState } from "@/lib/tutor-state";
import { stab } from "@/lib/gami/state";
import { syncTutor } from "@/lib/tutor-sync";
import { gami, gm } from "./gami";
import { useProgress } from "./progress";

/** Tutor freigeschaltet auf diesem Gerät (/tutor?premium=1) – zeigt den Menüpunkt; der Server prüft zusätzlich die Admin-Rolle */
export const PREMIUM_KEY = "tap2coach-premium";
export const isPremium = () => { try { return localStorage.getItem(PREMIUM_KEY) === "1"; } catch { return false; } };

const K = { stand: "tap2coach-tutor-stand", chat: "tap2coach-tutor-sitzung", model: "tap2coach-tutor-modell", dev: "tap2coach-tutor-geraet" };
const read = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat oder voll */ } };

export const KB = makeKb(TAP2), IDS = kbIds(KB);
export const topicOfKern = (k: string) => KB.topicOf.get(k.split(".")[0]);
/** Wissensbasis-Überblick für den System-Teil (fest → Prompt-Caching) */
let wissen = "";
export const tutorWissen = () => (wissen ||= kbOverview(KB));

const randId = (n = 10) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
function device(): string { let d = read<string>(K.dev, ""); if (!/^[A-Za-z0-9_-]{4,40}$/.test(d)) { d = "g" + randId(9); write(K.dev, d); } return d; }

function loadState(): TutorState {
  if (typeof window === "undefined") return emptyTutor();
  return normalizeTutor(read<unknown>(K.stand, null), IDS); // alles vor dem Stichtag (EPOCH) fällt dabei weg
}
function loadConvo(): Convo | null {
  const c = read<Convo | null>(K.chat, null);
  return c && typeof c === "object" && Array.isArray(c.msgs) && typeof c.thema === "string" && IDS.topics.has(c.thema) && c.rounds && c.started >= EPOCH ? c : null;
}

export type SyncInfo = { busy: boolean; at: number; err: string; off: string };
// Die alte Funktion lehnt Anfragen ohne System-Teil ab – dann neu deployen
const OLD_FN = "Auf dem Server läuft noch eine ältere Tutor-Funktion. Bitte den Code aus app/supabase/functions/tutor/index.ts im Supabase-Dashboard unter Edge Functions → „tutor“ einsetzen und deployen.";

type Store = {
  state: TutorState; convo: Convo | null; model: Model; busy: boolean; err: string; sync: SyncInfo;
  setModel: (m: Model) => void;
  /** Sitzung zu einem Thema öffnen – ohne Anfrage an die KI; sie beginnt erst mit meiner ersten Nachricht (spart Kosten) */
  open: (thema: string, fokus?: string[]) => void;
  /** Antwort/Rückfrage, „Ich stehe auf dem Schlauch“ oder Sitzung beenden. Die erste Nachricht geht mit der Übergabe
   *  (Stand, Fehlvorstellungen, Lernpakete) an den Tutor. false = nicht gesendet */
  send: (m: UserMeta, handoff?: () => string) => Promise<boolean>;
  /** Sitzung schließen (Verlauf weg, Stand bleibt) */
  close: () => void;
  syncNow: () => Promise<void>;
  /** Tutor-Wissen zurücksetzen – auf allen Geräten (Belege, Fehlvorstellungen, Sitzungen). XP bleiben. */
  reset: () => void;
};

let syncTimer: ReturnType<typeof setTimeout> | undefined;

export const useTutor = create<Store>((set, get) => {
  const saveState = (state: TutorState) => { write(K.stand, state); set({ state }); syncSoon(); };
  const saveConvo = (convo: Convo | null) => { write(K.chat, convo); set({ convo }); };
  const syncSoon = (ms = 4000) => { clearTimeout(syncTimer); syncTimer = setTimeout(() => void get().syncNow(), ms); };

  async function call(c: Convo): Promise<{ content: Block[]; usage: Record<string, unknown>; stop: string }> {
    if (!supabase) throw new Error("Der Tutor braucht den Server (Supabase).");
    const { data, error } = await supabase.functions.invoke("tutor", { body: { model: c.model, wissen: tutorWissen(), messages: c.msgs } });
    if (error) {
      const ctx = (error as { context?: Response }).context, j = ctx ? await ctx.json().catch(() => null) : null;
      const msg = String(j?.error ?? "");
      throw new Error(/System-Teil fehlt|^Ungültige Anfrage\.$|Werkzeuge$/.test(msg) || (j && j.v != null && j.v < 3) ? OLD_FN : msg || "Der Tutor ist gerade nicht erreichbar.");
    }
    if (data?.stop === "refusal") throw new Error(String(data?.text || "Keine Antwort erhalten."));
    if (!Array.isArray(data?.content)) throw new Error("Keine Antwort erhalten.");
    return { content: data.content as Block[], usage: data.usage ?? {}, stop: String(data.stop ?? "") };
  }

  /** Eine Runde: meine Nachricht senden, Antwort verarbeiten, Belege/XP/Sitzung speichern */
  async function round(base: Convo, meta: UserMeta, blocks: Block[]): Promise<boolean> {
    set({ busy: true, err: "" });
    const idx = base.msgs.length;
    const sent: Convo = { ...base, msgs: [...base.msgs, userMsg(base, blocks as never)], ui: { ...base.ui, [idx]: meta }, pending: undefined };
    try {
      const r = await call(sent), now = Date.now();
      const a = applyReply({ ...sent, cost: sent.cost + costOf(sent.model, r.usage) }, r.content, IDS, topicOfKern, now, meta.kind === "antwort" ? meta.sich : undefined);
      let c = a.convo, st = addEvidence(get().state, a.evidence);
      // Belohnung: nur die erste Bewertung je Aufgabe zählt
      if (a.graded?.first) {
        const g = a.graded, d = today(), r = rewardArgs(g), before = gami().earned;
        gm.answer({ id: `tutor:${c.id}:${g.key}`, topic: g.topic }, r.ok, r.unsure, r.f, r.t); // wie eine neue Frage in der Lernrunde
        const xp = Math.max(0, gami().earned - before);
        st = addXpDay(st, d, device(), xp);
        useProgress.getState().logTutor();
        c = { ...c, bewertungen: { ...c.bewertungen, [g.key]: { ...c.bewertungen[g.key], xp } } };
      }
      const graded = Object.values(c.bewertungen);
      st = putSession(st, { id: c.id, t: c.thema, start: c.started, ...(c.ende ? { end: now } : {}), aufgaben: graded.length, punkte: graded.reduce((s, x) => s + x.b.punkte, 0), max: graded.reduce((s, x) => s + x.b.max, 0), xp: graded.reduce((s, x) => s + x.xp, 0), model: c.model });
      saveConvo(c); saveState(st);
      return true;
    } catch (e) { set({ err: e instanceof Error ? e.message : "Fehler." }); return false; }
    finally { set({ busy: false }); }
  }

  return {
    state: loadState(), convo: typeof window === "undefined" ? null : loadConvo(),
    model: read<Model>(K.model, "sonnet") === "haiku" ? "haiku" : "sonnet",
    busy: false, err: "", sync: { busy: false, at: 0, err: "", off: "" },
    setModel: (model) => { write(K.model, model); set({ model }); const c = get().convo; if (c && !c.msgs.length) saveConvo({ ...c, model }); },
    open: (thema, fokus) => {
      if (get().busy || !IDS.topics.has(thema)) return;
      saveConvo({ ...newConvo(`s${Date.now().toString(36)}${randId(4)}`, thema, get().model, Date.now()), ...(fokus?.length ? { fokus } : {}) });
      set({ err: "" });
    },
    send: async (m, handoff) => {
      const c = get().convo; if (!c || get().busy || c.ende && m.kind !== "antwort") return false;
      if (m.kind === "antwort" && !m.text?.trim()) return false;
      if (!c.msgs.length) { // erste Nachricht: Übergabe + meine Nachricht, erst jetzt fragt die App die KI
        if (m.kind !== "antwort" || !handoff) return false;
        const first = { ...c, model: get().model, started: Date.now() };
        return round(first, { kind: "antwort", text: m.text }, chunks(`${handoff()}\n\nMeine erste Nachricht:\n"""\n${(m.text ?? "").trim().slice(0, 5000)}\n"""`));
      }
      if (tooLong(c)) { set({ err: "Diese Sitzung ist sehr lang geworden. Beende sie und starte eine neue – dein Stand bleibt erhalten." }); return false; }
      const offen = c.offen ? c.aufgaben[c.offen] : undefined;
      return round(c, { ...m, ...(offen ? { aufgabe: offen.id } : {}) }, [{ type: "text", text: userText(m, offen) }]);
    },
    close: () => { saveConvo(null); set({ err: "" }); },
    syncNow: async () => {
      if (!supabase) { set({ sync: { ...get().sync, off: "Ohne Server nur auf diesem Gerät." } }); return; }
      const { data } = await supabase.auth.getSession();
      if (!data.session) { set({ sync: { ...get().sync, off: "Melde dich mit GitHub an, dann ist dein Tutor-Stand auf allen deinen Geräten gleich." } }); return; }
      if (get().sync.busy) { syncSoon(1500); return; }
      set({ sync: { ...get().sync, busy: true, err: "", off: "" } });
      try {
        const rpc = async (fn: string, args: Record<string, unknown>) => { const r = await supabase!.rpc(fn, args); if (r.error) throw new Error(String(r.error.message).slice(0, 160)); return r.data as unknown; };
        const r = await syncTutor(rpc, get().state, IDS);
        // Während des Abgleichs Neues (z. B. eine Bewertung) nicht verlieren: mit dem aktuellen Stand zusammenführen
        const now = mergeTutor(get().state, r.state);
        if (stab(now) !== stab(get().state)) { write(K.stand, now); set({ state: now }); }
        if (stab(now) !== stab(r.state)) syncSoon(1500);
        set({ sync: { busy: false, at: Date.now(), err: "", off: "" } });
      } catch (e) {
        const m = e instanceof Error ? e.message : "unbekannt";
        set({ sync: { ...get().sync, busy: false, err: /app_tutor_state/.test(m) ? "Der Tutor-Stand ist auf dem Server noch nicht eingerichtet (supabase/004_app_tutor_state_konto.sql)." : "Abgleich fehlgeschlagen: " + m } });
      }
    },
    reset: () => { saveState(resetTutor(get().state, Date.now())); syncSoon(500); },
  };
});

/** Für die Anzeige: Sicherheit als Zahl prüfen */
export const asSicher = (n: unknown): Sicher | undefined => (n === 0 || n === 1 || n === 2 || n === 3 ? n : undefined);

if (typeof window !== "undefined") {
  // Anderer Tab hat gespeichert: übernehmen
  window.addEventListener("storage", (e) => {
    if (e.key === K.stand && e.newValue) { try { useTutor.setState({ state: normalizeTutor(JSON.parse(e.newValue), IDS) }); } catch { /* fremder Inhalt */ } }
    if (e.key === K.chat) useTutor.setState({ convo: loadConvo() });
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && syncTimer) { clearTimeout(syncTimer); syncTimer = undefined; void useTutor.getState().syncNow(); } });
}
