/**
 * Schlüssel-Sync mit der Live-App (tap2_sync). Die Dev-App ist damit „ein weiteres Gerät“ im bestehenden Sync:
 * gleicher Schlüssel, gleiche Verschlüsselung, gleiches Format seal({ v: 1, s, g, ev, at }), gleiche Regeln
 * (Ablauf 1:1 wie syncNow() in index.html). Freigegeben vom Betreiber am 13.11.2026 – schreibt nur in den Eintrag,
 * dessen Schlüssel auf diesem Gerät liegt.
 *
 * Belohnungen (g): Solange das Belohnungs-Modul nicht portiert ist, führt die Dev-App g UNVERÄNDERT mit
 * (übernimmt den Stand aus der Cloud), damit auf der Live-App nichts verloren geht.
 * Vor dem ersten Abgleich wird der lokale Stand zurückgelegt (tap2coach-vorsync) – wie in der Live-App.
 */
import { create } from "zustand";
import { NORMALIZE_CTX } from "@/content/catalog";
import { aesKey, isKey, keyFmt, keyRaw, seal, unseal } from "@/lib/crypto";
import { canon, evMerge, mergeStates, type Ev } from "@/lib/sync-merge";
import { normalize } from "@/lib/state";
import { supabase } from "@/lib/supabase";
import { useProgress } from "./progress";
import { gm } from "@/legacy/gami-env";

const KEY_SYNC = "tap2coach-sync", KEY_VORSYNC = "tap2coach-vorsync", KEY_GAMI = "tap2coach-gami";
// Belohnungen aus der Cloud im kompakten Sync-Format (gm("pack")) – getrennt von tap2coach-gami (volles Format der Live-App)
const KEY_GAMI_CLOUD = "tap2coach-gami-cloud";
export type LiveCfg = { v: 1; key: string; rev: number; at: number; ev: Ev; since: number; grp?: string };
export const liveGet = (): LiveCfg | null => { try { const c = JSON.parse(localStorage.getItem(KEY_SYNC) || "null"); return c && typeof c.key === "string" && isKey(keyRaw(c.key)) ? c : null; } catch { return null; } };
const liveSet = (c: LiveCfg | null) => { try { if (c) localStorage.setItem(KEY_SYNC, JSON.stringify(c)); else localStorage.removeItem(KEY_SYNC); } catch { /* privat */ } };
const te = new TextEncoder();
const hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
/** Server-ID des Sync-Eintrags (Prüfsumme, nicht der Schlüssel) – wie syncIds() in der Live-App. */
export const syncId = (key: string) => hex("tap2-id|" + keyRaw(key));
/** Ranglisten-ID für verbundene Geräte – wie lbId() in der Live-App. */
export const lbIdFor = (key: string) => hex("tap2-lb|s|" + keyRaw(key));

/** Lösch-Ereignis vermerken (nur solange verbunden) – wie syncEv() in der Live-App. */
export function recordEv(kind: "m" | "e" | "c" | "r", id: string, val?: unknown) {
  const c = liveGet(); if (!c) return;
  c.ev = evMerge(c.ev, null);
  if (kind === "m") c.ev.m[id] = [Date.now(), val ? 1 : 0];
  else if (kind === "e") c.ev.e[id] = [Date.now(), val || null];
  else c.ev[kind][id] = Date.now();
  liveSet(c);
}

type Pack = { s?: unknown; g?: unknown; ev?: Partial<Ev> };
type Store = { cfg: LiveCfg | null; busy: boolean; err: string; msg: string; connect: (key: string) => Promise<void>; disconnect: () => void; syncNow: () => Promise<void> };

export const useLiveSync = create<Store>((set, get) => ({
  cfg: typeof window === "undefined" ? null : liveGet(),
  busy: false, err: "", msg: "",
  connect: async (input) => {
    const raw = keyRaw(input);
    if (!isKey(raw)) { set({ err: "Der Schlüssel hat 32 Zeichen (8 Vierergruppen). Du findest ihn in der Live-App unter Einstellungen → Geräte-Sync → Schlüssel anzeigen." }); return; }
    try { localStorage.setItem(KEY_VORSYNC, JSON.stringify({ at: new Date().toISOString(), data: localStorage.getItem("tap2coach"), gami: localStorage.getItem(KEY_GAMI) })); } catch { /* privat */ }
    const prev = liveGet();
    const cfg: LiveCfg = { v: 1, key: keyFmt(raw), rev: 0, at: 0, ev: evMerge(prev?.ev, null), since: Date.now() };
    liveSet(cfg); set({ cfg, err: "", msg: "" });
    await get().syncNow();
  },
  disconnect: () => { liveSet(null); set({ cfg: null, msg: "Getrennt. Dein Lernstand hier bleibt erhalten." }); },
  syncNow: async () => {
    const cfg = liveGet();
    if (!supabase || !cfg || get().busy) return;
    set({ busy: true, err: "" });
    try {
      const id = await syncId(cfg.key), aes = await aesKey(cfg.key);
      let remote = (await supabase.rpc("tap2_pull", { p_id: id })).data as { rev?: number; blob?: string; gone?: boolean } | null;
      let ev = evMerge(cfg.ev, null), done = false;
      for (let tries = 0; tries < 4 && !done; tries++) {
        let rev = 0, R: Pack | null = null;
        if (remote?.blob) { rev = +(remote.rev ?? 0) || 0; R = (await unseal(remote.blob, aes)) as Pack; }
        else if ((cfg.rev || 0) > 0 || remote?.gone) { liveSet(null); set({ cfg: null, msg: "Die Kopie in der Cloud wurde gelöscht. Dieses Gerät ist nicht mehr verbunden – dein Lernstand hier bleibt erhalten." }); return; }
        ev = evMerge(ev, R?.ev);
        let S = useProgress.getState().S;
        if (R?.s && typeof R.s === "object") { const m = mergeStates(S, R.s, NORMALIZE_CTX, ev); if (canon(m) !== canon(S)) { useProgress.getState().applySynced(m); S = m; } }
        // Belohnungen: unverändert aus der Cloud übernehmen (Belohnungs-Modul folgt), lokal ablegen für später
        // Belohnungen wie in der Live-App: Cloud-Stand einmischen (merge), dann den eigenen Stand packen (pack)
        if (R?.g) gm("merge", R.g);
        const packed = gm("pack");
        const g = packed ?? R?.g ?? (() => { try { return JSON.parse(localStorage.getItem(KEY_GAMI_CLOUD) || "null"); } catch { return null; } })(); // Rückfall, falls das Modul ausfällt
        if (!packed && R?.g) { try { localStorage.setItem(KEY_GAMI_CLOUD, JSON.stringify(R.g)); } catch { /* privat */ } }
        if (R?.s && canon(normalize(structuredClone(R.s), NORMALIZE_CTX)) === canon(S) && canon(R.g ?? null) === canon(g ?? null) && canon(R.ev ?? {}) === canon(ev)) { cfg.rev = rev; done = true; break; }
        const res = (await supabase.rpc("tap2_push", { p_id: id, p_base: rev, p_blob: await seal({ v: 1, s: S, g: g ?? null, ev, at: Date.now() }, aes) })).data as { ok?: boolean; rev?: number; blob?: string } | null;
        if (res?.ok) { cfg.rev = +(res.rev ?? 0); done = true; } else remote = res;
      }
      if (!done) throw new Error("Abgleich gerade nicht möglich, versuche es gleich noch einmal.");
      const cur = liveGet(); if (!cur || cur.key !== cfg.key) return;
      cur.rev = cfg.rev; cur.at = Date.now(); cur.ev = evMerge(cur.ev, ev); cur.grp = id.slice(0, 4).toUpperCase(); liveSet(cur);
      set({ cfg: cur, msg: "" });
    } catch (e) {
      const n = e instanceof Error ? e.name : "";
      set({ err: n === "OperationError" ? "Der Stand in der Cloud lässt sich mit diesem Schlüssel nicht öffnen." : "Abgleich fehlgeschlagen. Dein Stand ist hier sicher gespeichert." });
    } finally { set({ busy: false }); }
  },
}));

if (typeof window !== "undefined" && supabase) {
  if (liveGet()) void useLiveSync.getState().syncNow();
  let timer: ReturnType<typeof setTimeout> | undefined;
  useProgress.subscribe((s, prev) => {
    if (s.S === prev.S || useLiveSync.getState().busy || !liveGet()) return;
    clearTimeout(timer); timer = setTimeout(() => void useLiveSync.getState().syncNow(), 20000); // wie Live-App: 20 s nach Änderungen
  });
}
