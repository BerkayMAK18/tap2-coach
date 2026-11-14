/**
 * Schlüssel-Sync mit der Live-App (tap2_sync). Die Dev-App ist damit „ein weiteres Gerät“ im bestehenden Sync:
 * gleicher Schlüssel, gleiche Verschlüsselung, gleiches Format seal({ v: 1, s, g, ev, at }), gleiche Regeln
 * (Ablauf 1:1 wie syncNow() in index.html). Freigegeben vom Betreiber am 13.11.2026 – schreibt nur in den Eintrag,
 * dessen Schlüssel auf diesem Gerät liegt.
 *
 * Belohnungen (g): wie die Live-App – Cloud-Stand einmischen (merge), eigenen Stand packen (pack); Format unverändert.
 * Fällt der Belohnungs-Teil aus, wird g unverändert weitergereicht, damit nichts verloren geht.
 * Vor dem ersten Abgleich wird der lokale Stand zurückgelegt (tap2coach-vorsync) – wie in der Live-App.
 */
import { create } from "zustand";
import { NORMALIZE_CTX } from "@/content/catalog";
import { aesKey, isKey, keyFmt, keyRaw, newSyncKey, seal, unseal } from "@/lib/crypto";
import { newPairCode, pairHash, pairOpen, pairSeal, parsePairInput } from "@/lib/pair";
import { canon, evMerge, mergeStates, type Ev } from "@/lib/sync-merge";
import { normalize } from "@/lib/state";
import { supabase } from "@/lib/supabase";
import { useProgress } from "./progress";
import { connectGamiSync, gm } from "./gami";

const KEY_SYNC = "tap2coach-sync", KEY_VORSYNC = "tap2coach-vorsync", KEY_GAMI = "tap2coach-gami";
// Belohnungen aus der Cloud im kompakten Sync-Format (gm.pack()) – getrennt von tap2coach-gami (volles Format der Live-App)
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
/** Lokalen Stand vor dem Verbinden zurücklegen (backupBeforeSync der Live-App, tap2coach-vorsync) */
function backupBeforeSync() { try { localStorage.setItem(KEY_VORSYNC, JSON.stringify({ at: new Date().toISOString(), data: localStorage.getItem("tap2coach"), gami: localStorage.getItem(KEY_GAMI) })); } catch { /* privat */ } }
/** Server-Funktion aufrufen; Fehlermeldung wie die Live-App (gekürzt) */
async function rpc(fn: string, args: Record<string, unknown>) {
  if (!supabase) throw new Error("Sync ist nicht eingerichtet.");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(String(error.message).replace(/^TypeError: /, "").slice(0, 160)); // supabase-js setzt „TypeError: “ vor Netzwerkfehler – Live-App zeigt nur die Meldung
  return data as unknown;
}

export function recordEv(kind: "m" | "e" | "c" | "r", id: string, val?: unknown) {
  const c = liveGet(); if (!c) return;
  c.ev = evMerge(c.ev, null);
  if (kind === "m") c.ev.m[id] = [Date.now(), val ? 1 : 0];
  else if (kind === "e") c.ev.e[id] = [Date.now(), val || null];
  else c.ev[kind][id] = Date.now();
  liveSet(c);
}

type Pack = { s?: unknown; g?: unknown; ev?: Partial<Ev> };
/** Kopplungscode auf diesem Gerät (SY.pair der Live-App) */
export type Pair = { busy?: boolean; err?: string; code?: string; until?: number } | null;
type Store = {
  cfg: LiveCfg | null; busy: boolean; err: string; msg: string;
  // Ansicht der Sync-Karte wie SY in der Live-App: Kopplungscode, Rückfrage vor dem Verbinden, Angebot aus einer Sicherung,
  // Schlüssel sichtbar, Rückfrage Trennen/Löschen, Meldung zur Code-Eingabe
  pair: Pair; ask: { key: string } | null; offer: string | null; showKey: boolean; confirm: "off" | "del" | null; inErr: string;
  /** Mit Schlüssel verbinden – ohne Rückfrage (bisherige Karte der neuen App) */
  connect: (key: string) => Promise<void>;
  /** Verbinden nach Rückfrage (syncStart): Stand zurücklegen, Schlüssel setzen, abgleichen */
  start: (key: string) => Promise<void>;
  /** „Sync einschalten“: neuen Schlüssel erzeugen, abgleichen, gleich einen Kopplungscode anbieten */
  turnOn: () => Promise<void>;
  /** „Gerät hinzufügen“: Kurzcode (10 Minuten gültig) für ein weiteres Gerät */
  pairNew: () => Promise<void>;
  /** Code oder Schlüssel vom anderen Gerät eingeben → Rückfrage „Dieses Gerät verbinden?“ */
  redeem: (input: string) => Promise<void>;
  /** Kopie in der Cloud löschen und trennen */
  delCloud: () => Promise<void>;
  disconnect: () => void;
  syncNow: () => Promise<void>;
  setUi: (p: Partial<Pick<Store, "ask" | "offer" | "showKey" | "confirm" | "inErr" | "msg">>) => void;
};

let again = false;
export const useLiveSync = create<Store>((set, get) => ({
  cfg: typeof window === "undefined" ? null : liveGet(),
  busy: false, err: "", msg: "",
  pair: null, ask: null, offer: null, showKey: false, confirm: null, inErr: "",
  setUi: (p) => set(p),
  start: async (key) => {
    backupBeforeSync();
    const prev = liveGet();
    const cfg: LiveCfg = { v: 1, key: keyFmt(keyRaw(key)), rev: 0, at: 0, ev: evMerge(prev?.ev, null), since: Date.now() };
    liveSet(cfg); set({ cfg, ask: null, offer: null, msg: "", inErr: "", err: "" });
    await get().syncNow();
  },
  turnOn: async () => { await get().start(newSyncKey()); if (liveGet()) await get().pairNew(); },
  pairNew: async () => {
    const cfg = liveGet(); if (!cfg || !supabase) return;
    set({ pair: { busy: true } });
    try {
      let code = "", ok = false;
      for (let i = 0; i < 3 && !ok; i++) { code = newPairCode(); ok = !!(await rpc("tap2_pair_put", { p_hash: await pairHash(code), p_payload: await pairSeal(cfg.key, code) })); }
      if (!ok) throw new Error("kein Code");
      set({ pair: { code, until: Date.now() + 10 * 60000 } });
    } catch { set({ pair: { err: "Der Code konnte nicht erstellt werden. Prüfe die Internetverbindung." } }); }
  },
  redeem: async (input) => {
    set({ inErr: "" });
    const r = parsePairInput(input);
    if ("key" in r) { set({ ask: { key: keyFmt(keyRaw(r.key)) } }); return; }
    if ("err" in r) { set({ inErr: r.err }); return; }
    set({ inErr: "Wird geprüft …" });
    try {
      const p = await rpc("tap2_pair_get", { p_hash: await pairHash(r.code) });
      if (!p) { set({ inErr: "Der Code ist abgelaufen oder falsch. Erzeuge auf dem anderen Gerät einen neuen." }); return; }
      set({ inErr: "", ask: { key: await pairOpen(String(p), r.code) } });
    } catch { set({ inErr: "Verbinden gerade nicht möglich. Prüfe die Internetverbindung und versuche es erneut." }); }
  },
  delCloud: async () => {
    const cfg = liveGet(); if (!cfg) return;
    try {
      await rpc("tap2_delete", { p_id: await syncId(cfg.key) });
      liveSet(null);
      set({ cfg: null, confirm: null, pair: null, showKey: false, err: "", msg: "Die Kopie in der Cloud ist gelöscht und dieses Gerät getrennt. Dein Lernstand hier bleibt. Andere Geräte trennen sich beim nächsten Abgleich selbst." });
    } catch (e) { set({ confirm: null, err: "Löschen fehlgeschlagen: " + ((e instanceof Error && e.message) || "unbekannt") }); }
  },
  connect: async (input) => {
    const raw = keyRaw(input);
    if (!isKey(raw)) { set({ err: "Der Schlüssel hat 32 Zeichen (8 Vierergruppen). Du findest ihn in der Live-App unter Einstellungen → Geräte-Sync → Schlüssel anzeigen." }); return; }
    backupBeforeSync();
    const prev = liveGet();
    const cfg: LiveCfg = { v: 1, key: keyFmt(raw), rev: 0, at: 0, ev: evMerge(prev?.ev, null), since: Date.now() };
    liveSet(cfg); set({ cfg, err: "", msg: "" });
    await get().syncNow();
  },
  disconnect: () => { liveSet(null); set({ cfg: null, confirm: null, pair: null, showKey: false, err: "", msg: "Dieses Gerät ist getrennt. Dein Lernstand hier ist vollständig erhalten." }); },
  syncNow: async () => {
    const cfg = liveGet();
    if (!supabase || !cfg) return;
    if (get().busy) { again = true; return; } // läuft schon: danach noch einmal (SY.again)
    if (navigator.onLine === false) { set({ err: "Offline – der Abgleich folgt, sobald du wieder Internet hast." }); return; }
    set({ busy: true, err: "" });
    try {
      const id = await syncId(cfg.key), aes = await aesKey(cfg.key);
      let remote = (await rpc("tap2_pull", { p_id: id })) as { rev?: number; blob?: string; gone?: boolean } | null;
      let ev = evMerge(cfg.ev, null), done = false;
      for (let tries = 0; tries < 4 && !done; tries++) {
        let rev = 0, R: Pack | null = null;
        if (remote?.blob) { rev = +(remote.rev ?? 0) || 0; R = (await unseal(remote.blob, aes)) as Pack; }
        else if ((cfg.rev || 0) > 0 || remote?.gone) { liveSet(null); set({ cfg: null, msg: "Die Kopie in der Cloud wurde gelöscht. Dieses Gerät ist nicht mehr verbunden – dein Lernstand hier bleibt vollständig erhalten." }); return; }
        ev = evMerge(ev, R?.ev);
        let S = useProgress.getState().S;
        if (R?.s && typeof R.s === "object") { const m = mergeStates(S, R.s, NORMALIZE_CTX, ev); if (canon(m) !== canon(S)) { useProgress.getState().applySynced(m); S = m; } }
        // Belohnungen wie in der Live-App: Cloud-Stand einmischen (merge), dann den eigenen Stand packen (pack)
        if (R?.g) gm.merge(R.g);
        const packed = gm.pack();
        const g = packed ?? R?.g ?? (() => { try { return JSON.parse(localStorage.getItem(KEY_GAMI_CLOUD) || "null"); } catch { return null; } })(); // Rückfall, falls das Modul ausfällt
        if (!packed && R?.g) { try { localStorage.setItem(KEY_GAMI_CLOUD, JSON.stringify(R.g)); } catch { /* privat */ } }
        if (R?.s && canon(normalize(structuredClone(R.s), NORMALIZE_CTX)) === canon(S) && canon(R.g ?? null) === canon(g ?? null) && canon(R.ev ?? {}) === canon(ev)) { cfg.rev = rev; done = true; break; }
        const res = (await rpc("tap2_push", { p_id: id, p_base: rev, p_blob: await seal({ v: 1, s: S, g: g ?? null, ev, at: Date.now() }, aes) })) as { ok?: boolean; rev?: number; blob?: string } | null;
        if (res?.ok) { cfg.rev = +(res.rev ?? 0); done = true; } else remote = res;
      }
      if (!done) throw new Error("Abgleich gerade nicht möglich, versuche es gleich noch einmal.");
      const cur = liveGet(); if (!cur || cur.key !== cfg.key) return;
      cur.rev = cfg.rev; cur.at = Date.now(); cur.ev = evMerge(cur.ev, ev); cur.grp = id.slice(0, 4).toUpperCase(); liveSet(cur);
      set({ cfg: cur, msg: "" });
    } catch (e) {
      const n = e instanceof Error ? e.name : "", m = e instanceof Error && e.message ? e.message : "unbekannt";
      set({ err: n === "AbortError" ? "Der Server antwortet nicht. Dein Stand ist hier sicher gespeichert." : n === "OperationError" ? "Der Stand in der Cloud lässt sich mit diesem Schlüssel nicht öffnen." : "Abgleich fehlgeschlagen: " + m + ". Dein Stand ist hier sicher gespeichert." });
    } finally {
      set({ busy: false });
      if (again) { again = false; setTimeout(() => void get().syncNow(), 1500); }
    }
  },
}));

/** Bald abgleichen (syncSoon der Live-App), z. B. nach Belohnungen ohne Lernen */
let soonTimer: ReturnType<typeof setTimeout> | undefined;
export function syncSoon(ms?: number) { if (!supabase || !liveGet()) return; clearTimeout(soonTimer); soonTimer = setTimeout(() => { soonTimer = undefined; void useLiveSync.getState().syncNow(); }, ms ?? 20000); }
connectGamiSync({ get: liveGet, soon: syncSoon });

if (typeof window !== "undefined" && supabase) {
  if (liveGet()) void useLiveSync.getState().syncNow();
  let timer: ReturnType<typeof setTimeout> | undefined;
  useProgress.subscribe((s, prev) => {
    if (s.S === prev.S || useLiveSync.getState().busy || !liveGet()) return;
    clearTimeout(timer); timer = setTimeout(() => { timer = undefined; void useLiveSync.getState().syncNow(); }, 20000); // wie Live-App: 20 s nach Änderungen
  });
  // Wie die Live-App: beim Verlassen ausstehende Änderungen hochladen, beim Zurückkommen (nach > 30 s) und online abgleichen
  document.addEventListener("visibilitychange", () => {
    const c = liveGet(); if (!c) return;
    if (document.visibilityState === "hidden") { if (timer) { clearTimeout(timer); timer = undefined; void useLiveSync.getState().syncNow(); } }
    else if (!c.at || Date.now() - c.at > 30000) void useLiveSync.getState().syncNow();
  });
  window.addEventListener("online", () => { if (liveGet()) void useLiveSync.getState().syncNow(); });
  // Abgelaufenen Kopplungscode ausblenden
  setInterval(() => { const p = useLiveSync.getState().pair; if (p?.until && p.until < Date.now()) useLiveSync.setState({ pair: null }); }, 15000);
}
