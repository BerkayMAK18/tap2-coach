/**
 * Konto + Ende-zu-Ende-verschlüsselter Sync.
 *
 * Ablauf syncNow(): eigenen Stand vom Server holen (app_sync_pull) → mit dem Schlüssel entschlüsseln → mit dem lokalen
 * Stand zusammenführen (mergeStates) → verschlüsselt zurückschreiben (app_sync_push mit Versionsprüfung; war ein
 * anderes Gerät schneller, wird erneut zusammengeführt). Der Schlüssel liegt nur auf dem Gerät (KEYS.appSync).
 * Automatisch: beim Start und einige Sekunden nach jeder Änderung am Lernstand.
 */
import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { KEYS } from "@/config";
import { NORMALIZE_CTX } from "@/content/catalog";
import { aesKey, isKey, keyFmt, keyRaw, newSyncKey, seal, unseal } from "@/lib/crypto";
import { mergeStates } from "@/lib/sync-merge";
import { supabase } from "@/lib/supabase";
import { useProgress } from "./progress";

type SyncCfg = { key: string; rev: number };
type Store = {
  user: User | null;
  cfg: SyncCfg | null;
  busy: boolean;
  err: string;
  lastSync: number | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  createKey: () => Promise<void>;
  useKey: (input: string) => Promise<void>;
  syncNow: () => Promise<void>;
  deleteCloud: () => Promise<void>;
};

const readCfg = (): SyncCfg | null => { try { const c = JSON.parse(localStorage.getItem(KEYS.appSync) || "null"); return c && typeof c.key === "string" && isKey(keyRaw(c.key)) ? { key: c.key, rev: Number(c.rev) || 0 } : null; } catch { return null; } };
const writeCfg = (c: SyncCfg | null) => { try { if (c) localStorage.setItem(KEYS.appSync, JSON.stringify(c)); else localStorage.removeItem(KEYS.appSync); } catch { /* privat */ } };
const friendly = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  if (/decrypt|operation/i.test(m)) return "Der Schlüssel passt nicht zur Sicherung in deinem Konto.";
  if (/zu viele/.test(m)) return "Gerade sind zu viele neue Verbindungen. Bitte später erneut versuchen.";
  if (/fetch|network/i.test(m)) return "Keine Verbindung. Dein Lernstand ist lokal gespeichert, der Sync folgt später.";
  return "Synchronisieren hat nicht geklappt. Dein Lernstand ist lokal gespeichert.";
};

export const useAccount = create<Store>((set, get) => ({
  user: null,
  cfg: typeof window === "undefined" ? null : readCfg(),
  busy: false,
  err: "",
  lastSync: null,

  signIn: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: window.location.origin + "/einstellungen" } });
    if (error) set({ err: "Anmeldung fehlgeschlagen. Versuche es erneut." });
  },
  signOut: async () => { await supabase?.auth.signOut(); set({ user: null, err: "" }); },

  createKey: async () => { const cfg = { key: newSyncKey(), rev: 0 }; writeCfg(cfg); set({ cfg }); await get().syncNow(); },
  useKey: async (input) => {
    const raw = keyRaw(input);
    if (!isKey(raw)) { set({ err: "Der Schlüssel hat 32 Zeichen in 8 Vierergruppen." }); return; }
    const cfg = { key: keyFmt(raw), rev: 0 }; writeCfg(cfg); set({ cfg, err: "" }); await get().syncNow();
  },

  syncNow: async () => {
    const { cfg, user, busy } = get();
    if (!supabase || !cfg || !user || busy) return;
    set({ busy: true, err: "" });
    try {
      const aes = await aesKey(cfg.key);
      const pulled = (await supabase.rpc("app_sync_pull")).data as { rev: number; blob: string } | null;
      let base = pulled?.rev ?? 0;
      let merged = useProgress.getState().S;
      if (pulled?.blob) merged = mergeStates(merged, ((await unseal(pulled.blob, aes)) as { s: unknown }).s, NORMALIZE_CTX);
      for (let i = 0; i < 4; i++) {
        const { data, error } = await supabase.rpc("app_sync_push", { p_base: base, p_blob: await seal({ v: 1, s: merged, at: Date.now() }, aes) });
        if (error) throw new Error(error.message);
        const res = data as { ok: boolean; rev: number; blob?: string; gone?: boolean };
        if (res.ok) { base = res.rev; break; }
        if (res.gone) { base = 0; continue; }
        if (res.blob) merged = mergeStates(merged, ((await unseal(res.blob, aes)) as { s: unknown }).s, NORMALIZE_CTX);
        base = res.rev;
      }
      useProgress.getState().applySynced(merged);
      const next = { ...cfg, rev: base }; writeCfg(next);
      set({ cfg: next, lastSync: Date.now() });
    } catch (e) { set({ err: friendly(e) }); }
    finally { set({ busy: false }); }
  },

  deleteCloud: async () => {
    if (!supabase) return;
    const { error } = await supabase.rpc("app_sync_delete");
    if (error) { set({ err: "Löschen hat nicht geklappt. Versuche es erneut." }); return; }
    writeCfg(null); set({ cfg: null, lastSync: null });
  },
}));

// Anmeldestatus verfolgen und automatisch synchronisieren
if (typeof window !== "undefined" && supabase) {
  supabase.auth.getSession().then(({ data }) => { useAccount.setState({ user: data.session?.user ?? null }); void useAccount.getState().syncNow(); });
  supabase.auth.onAuthStateChange((_e, session) => useAccount.setState({ user: session?.user ?? null }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  useProgress.subscribe((s, prev) => {
    if (s.S === prev.S || useAccount.getState().busy) return;
    clearTimeout(timer); timer = setTimeout(() => void useAccount.getState().syncNow(), 5000);
  });
}
