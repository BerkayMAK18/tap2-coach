/**
 * Zentrale Einstellungen. Für einen neuen Jahrgang hier das Prüfungsdatum anpassen
 * (später: pro Katalog in der Katalog-Bibliothek).
 */
export const EXAM_DAY = "2026-11-25"; // TAP2 Winter 2026/27 – gleich wie in der Live-App
export const EXAM_DE = EXAM_DAY.split("-").reverse().join(".");

/** localStorage-Schlüssel – identisch mit der Live-App, damit Sicherungen und später Sync kompatibel sind. */
export const KEYS = {
  state: "tap2coach",
  session: "tap2coach-sess",
  beforeImport: "tap2coach-vor-import",
  appSync: "tap2coach-app-sync", // { key, rev } – Sync-Schlüssel nur auf diesem Gerät
} as const;

/**
 * Funktionsschalter. Der Datenschutzhinweis (/datenschutz) zeigt nur die Abschnitte aktiver Funktionen –
 * so beschreibt er immer genau das, was die App tatsächlich tut (Art. 13 DSGVO).
 * Beim Freischalten einer Funktion: Schalter setzen, Hinweis prüfen, docs/DATENSCHUTZ.md aktualisieren.
 */
const SUPABASE_ON = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const FEATURES = {
  account: SUPABASE_ON, // Anmeldung mit GitHub (Supabase Auth) – an, sobald die Build-Variablen gesetzt sind
  sync: SUPABASE_ON, // Ende-zu-Ende-verschlüsselte Sicherung/Sync im Konto
  leaderboard: false, // Rangliste mit selbst gewähltem Benutzernamen (Einwilligung)
  patchNotes: true, // Release-Liste von der GitHub-API (Seite Patch Notes, portiert 14.11.2026)
  tutor: false, // KI-Tutor – nur für freigeschaltete Konten (Admin), für andere unsichtbar
} as const;

/**
 * Verantwortlicher nach Art. 4 Nr. 7 DSGVO – Pflichtangabe im Datenschutzhinweis.
 * Kontakt bewusst über das GitHub-Profil (keine Firmenadresse). Kommt später eine eigene E-Mail dazu, hier ergänzen.
 */
export const CONTROLLER = {
  name: "Berkay Akdemir",
  contact: "über GitHub: github.com/BerkayMAK18",
} as const;

/** Stand des Datenschutzhinweises – bei jeder inhaltlichen Änderung anpassen. */
export const PRIVACY_VERSION = "2026-11-14";
