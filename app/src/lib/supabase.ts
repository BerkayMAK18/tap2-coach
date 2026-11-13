/**
 * Supabase-Client (nur Anmeldung + verschlüsselter Sync). Ohne VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 * (Build-Variablen in Cloudflare bzw. lokal per Umgebung) ist er null und alle Konto-Funktionen bleiben ausgeblendet.
 * Der Publishable Key ist öffentlich; geschützt wird über RLS und die app_*-Funktionen (supabase/001_app_sync.sql).
 * PKCE: Nach dem GitHub-Login steht nur ein einmaliger Code in der URL, kein Token.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = url && key && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) && !key.startsWith("sb_secret")
  ? createClient(url, key, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
