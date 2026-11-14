/**
 * Supabase-Client (nur Anmeldung + verschlüsselter Sync). Ohne VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 * (Build-Variablen in Cloudflare bzw. lokal per Umgebung) ist er null und alle Konto-Funktionen bleiben ausgeblendet.
 * Der Publishable Key ist öffentlich; geschützt wird über RLS und die app_*-Funktionen (supabase/001_app_sync.sql).
 * PKCE: Nach dem GitHub-Login steht nur ein einmaliger Code in der URL, kein Token.
 *
 * Testzugang wie in der Live-App (syncConf): Nur auf localhost lässt sich ohne Build-Variablen ein Projekt in diesem
 * Browser hinterlegen (tap2coach-sync-dev, Einstellungen → Geräte synchronisieren). Nur für den Geräte-Sync gedacht;
 * das Konto (FEATURES.account) bleibt an die Build-Variablen gebunden.
 */
import { createClient } from "@supabase/supabase-js";

export const KEY_SYNC_DEV = "tap2coach-sync-dev";
export const isLocalHost = typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const okUrl = (u: unknown): u is string => typeof u === "string" && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(u);
const okKey = (k: unknown): k is string => typeof k === "string" && k.length >= 20 && !k.startsWith("sb_secret");

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
/** Lokal hinterlegter Testzugang (nur localhost, nur wenn keine Build-Variablen gesetzt sind) */
function devConf(): { url: string; key: string } | null {
  if (envUrl || !isLocalHost) return null;
  try { const d = JSON.parse(localStorage.getItem(KEY_SYNC_DEV) || "null"); return d && okUrl(d.url) && okKey(d.key) ? d : null; } catch { return null; }
}
const conf = okUrl(envUrl) && okKey(envKey) ? { url: envUrl, key: envKey } : devConf();
export const supabase = conf ? createClient(conf.url, conf.key, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

/** Testzugang speichern (danach neu laden, damit alle Teile denselben Client nutzen). false: Eingabe ungültig. */
export function saveDevConf(url: string, key: string): boolean {
  const u = url.trim().replace(/\/+$/, ""), k = key.trim();
  if (!okUrl(u) || !okKey(k)) return false;
  try { localStorage.setItem(KEY_SYNC_DEV, JSON.stringify({ url: u, key: k })); } catch { return false; }
  return true;
}
