/**
 * Konto („ein Konto, ein Stand“): Anmelden mit GitHub reicht – Lernstand und Belohnungen liegen im Konto (app_sync,
 * supabase/001_app_sync.sql) und sind auf jedem angemeldeten Gerät gleich. Kein Schlüssel (Entscheidung 14.11.2026;
 * wer Ende-zu-Ende-Verschlüsselung möchte, nutzt den Geräte-Sync ohne Konto).
 *
 * Ablauf syncNow(): Stand holen → mit dem Gerät zusammenführen (Lernstand: mergeStates, Belohnungen: gm.merge –
 * nichts geht verloren) → bei Änderung zurückschreiben (Versionsprüfung, lib/konto-sync.ts). Automatisch nach dem
 * Anmelden und einige Sekunden nach Änderungen an Lernstand oder Belohnungen.
 * Stand ohne Konto übernehmen: Kurzcode (vom Geräte-Sync eines anderen Geräts) oder Sync-Schlüssel eingeben – der Stand
 * dieser Gruppe wird einmalig eingemischt und dann im Konto gespeichert.
 */
import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { NORMALIZE_CTX } from "@/content/catalog";
import { aesKey, unseal } from "@/lib/crypto";
import { kontoSync, type Doc } from "@/lib/konto-sync";
import { pairHash, pairOpen, parsePairInput } from "@/lib/pair";
import { isObj, normalize, type State } from "@/lib/state";
import { canon, evMerge, mergeStates, type Ev } from "@/lib/sync-merge";
import { supabase } from "@/lib/supabase";
import { gm, useGami } from "./gami";
import { syncId } from "./livesync";
import { useProgress } from "./progress";

type Store = {
  user: User | null;
  /** Anmeldestatus geladen (vorher ist user noch unbekannt – z. B. kein „gesperrt“ anzeigen) */
  ready: boolean;
  busy: boolean;
  err: string;
  lastSync: number | null;
  /** Stand ohne Konto übernehmen: läuft / Rückmeldung */
  imp: { busy?: boolean; err?: string; msg?: string } | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  deleteCloud: () => Promise<void>;
  /** Kurzcode oder Sync-Schlüssel eines Geräts ohne Konto → dessen Stand ins Konto übernehmen */
  importNoAccount: (input: string) => Promise<void>;
};

/** Inhalt im Konto: Lernstand (Format v7) und Belohnungen (Paket wie im Sync) */
type Acc = { s: State; g: unknown };
const accDoc: Doc<Acc> = {
  pull: "app_sync_pull", push: "app_sync_push",
  read: (d) => (isObj(d) && isObj(d.s) ? { s: normalize(structuredClone(d.s), NORMALIZE_CTX), g: d.g ?? null } : null),
  // Belohnungen nur einmischen, wenn sie sich unterscheiden (gm.merge zeichnet neu – sonst Abgleich-Schleife)
  merge: (l, r) => { if (r.g && canon(r.g) !== canon(gm.pack() ?? null)) gm.merge(r.g); return { s: mergeStates(l.s, r.s, NORMALIZE_CTX), g: gm.pack() ?? r.g ?? l.g }; },
  same: (a, b) => canon(a.s) === canon(b.s) && canon(a.g ?? null) === canon(b.g ?? null),
  data: (a) => ({ v: 1, s: a.s, g: a.g ?? null, at: Date.now() }),
};

const friendly = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  if (/app_sync/.test(m) && /function|exist|schema/i.test(m)) return "Der Konto-Sync ist auf dem Server noch nicht eingerichtet (supabase/001_app_sync.sql).";
  if (/zu viele/.test(m)) return "Gerade sind zu viele neue Verbindungen. Bitte später erneut versuchen.";
  if (/fetch|network/i.test(m)) return "Keine Verbindung. Dein Lernstand ist lokal gespeichert, der Abgleich folgt später.";
  return "Synchronisieren hat nicht geklappt (" + m.slice(0, 80) + "). Dein Lernstand ist lokal gespeichert.";
};
async function rpc(fn: string, args: Record<string, unknown>) {
  if (!supabase) throw new Error("Server nicht eingerichtet");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(String(error.message).slice(0, 200));
  return data as unknown;
}

// Früher (bis 14.11.2026) lag hier ein eigener Schlüssel für den Konto-Sync – wird nicht mehr gebraucht
try { localStorage.removeItem("tap2coach-app-sync"); } catch { /* privat */ }

/** Premium (KI-Tutor mit Claude): nur Konten mit app_metadata.role = "admin" – setzt nur der Betreiber, Nutzer können
 *  app_metadata nicht selbst ändern. Die Edge Function prüft das zusätzlich serverseitig. */
export const isAdmin = (u: User | null | undefined) => u?.app_metadata?.role === "admin";

export const useAccount = create<Store>((set, get) => ({
  user: null, ready: !supabase, busy: false, err: "", lastSync: null, imp: null,

  signIn: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: window.location.origin + "/einstellungen" } });
    if (error) set({ err: "Anmeldung fehlgeschlagen. Versuche es erneut." });
  },
  signOut: async () => { await supabase?.auth.signOut(); set({ user: null, err: "", lastSync: null }); },

  syncNow: async () => {
    const { user, busy } = get();
    if (!supabase || !user) return;
    if (busy) { again = true; return; }
    set({ busy: true, err: "" });
    try {
      const local: Acc = { s: useProgress.getState().S, g: gm.pack() };
      const r = await kontoSync(rpc, accDoc, local);
      if (canon(r.state.s) !== canon(useProgress.getState().S)) useProgress.getState().applySynced(r.state.s);
      set({ lastSync: Date.now() });
    } catch (e) { set({ err: friendly(e) }); }
    finally { set({ busy: false }); if (again) { again = false; setTimeout(() => void get().syncNow(), 1500); } }
  },

  deleteCloud: async () => {
    try { await rpc("app_sync_delete", {}); set({ lastSync: null, err: "" }); }
    catch { set({ err: "Löschen hat nicht geklappt. Versuche es erneut." }); }
  },

  importNoAccount: async (input) => {
    const p = parsePairInput(input);
    if ("err" in p) { set({ imp: { err: p.err } }); return; }
    set({ imp: { busy: true } });
    try {
      const key = "key" in p ? p.key : await (async () => {
        const payload = await rpc("tap2_pair_get", { p_hash: await pairHash(p.code) });
        if (!payload) throw new Error("code");
        return pairOpen(String(payload), p.code);
      })();
      const remote = (await rpc("tap2_pull", { p_id: await syncId(key) })) as { blob?: string } | null;
      if (!remote?.blob) { set({ imp: { err: "Unter diesem Code liegt kein Stand. Ist das andere Gerät mit dem Geräte-Sync verbunden?" } }); return; }
      const R = (await unseal(remote.blob, await aesKey(key))) as { s?: unknown; g?: unknown; ev?: Partial<Ev> };
      if (R?.s && typeof R.s === "object") useProgress.getState().applySynced(mergeStates(useProgress.getState().S, R.s, NORMALIZE_CTX, evMerge(null, R.ev)));
      if (R?.g) gm.merge(R.g);
      set({ imp: { msg: "Übernommen – der Stand ohne Konto ist jetzt mit deinem Konto zusammengeführt. Nichts ging verloren." } });
      await get().syncNow();
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      set({ imp: { err: m === "code" ? "Der Code ist abgelaufen oder falsch. Erzeuge auf dem anderen Gerät einen neuen (Geräte synchronisieren → Gerät hinzufügen)."
        : e instanceof Error && e.name === "OperationError" ? "Der Stand lässt sich mit diesem Schlüssel nicht öffnen."
        : "Übernehmen gerade nicht möglich. Prüfe die Internetverbindung und versuche es erneut." } });
    }
  },
}));
let again = false;

// Anmeldestatus verfolgen und automatisch abgleichen
if (typeof window !== "undefined" && supabase) {
  supabase.auth.getSession().then(async ({ data }) => {
    useAccount.setState({ user: data.session?.user ?? null });
    // Rolle (app_metadata) frisch vom Server: ein älterer Login auf einem Gerät kennt eine später gesetzte Rolle sonst nicht
    if (data.session) { try { const { data: u } = await supabase!.auth.getUser(); if (u.user) useAccount.setState({ user: u.user }); } catch { /* offline: gespeicherten Stand nutzen */ } }
    useAccount.setState({ ready: true });
    void useAccount.getState().syncNow();
  });
  supabase.auth.onAuthStateChange((_e, session) => {
    const was = useAccount.getState().user?.id;
    useAccount.setState({ user: session?.user ?? null });
    if (session?.user && session.user.id !== was) void useAccount.getState().syncNow(); // gerade angemeldet: Gerät ins Konto einmischen
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const soon = () => { if (!useAccount.getState().user) return; clearTimeout(timer); timer = setTimeout(() => void useAccount.getState().syncNow(), 5000); };
  useProgress.subscribe((s, prev) => { if (s.S !== prev.S && !useAccount.getState().busy) soon(); });
  useGami.subscribe((s, prev) => { if (s.n !== prev.n && !useAccount.getState().busy) soon(); }); // Belohnungen geändert (XP, Schatzkammer, Garderobe …)
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && timer) { clearTimeout(timer); timer = undefined; void useAccount.getState().syncNow(); } });
}
