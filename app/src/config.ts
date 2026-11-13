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
} as const;

/**
 * Funktionsschalter. Der Datenschutzhinweis (/datenschutz) zeigt nur die Abschnitte aktiver Funktionen –
 * so beschreibt er immer genau das, was die App tatsächlich tut (Art. 13 DSGVO).
 * Beim Freischalten einer Funktion: Schalter setzen, Hinweis prüfen, docs/DATENSCHUTZ.md aktualisieren.
 */
export const FEATURES = {
  account: false, // Anmeldung mit GitHub (Supabase Auth)
  sync: false, // Ende-zu-Ende-verschlüsselte Sicherung/Sync im Konto
  leaderboard: false, // Rangliste mit selbst gewähltem Benutzernamen (Einwilligung)
  patchNotes: false, // Release-Liste von der GitHub-API
  tutor: false, // KI-Tutor – nur für freigeschaltete Konten (Admin), für andere unsichtbar
} as const;

/**
 * Verantwortlicher nach Art. 4 Nr. 7 DSGVO – Pflichtangabe im Datenschutzhinweis.
 * TODO vor der Veröffentlichung: echten Namen und eine erreichbare Kontaktadresse eintragen
 * (keine Firmenadresse; z. B. eigene E-Mail oder Kontaktformular).
 */
export const CONTROLLER = {
  name: "[Name eintragen]",
  contact: "[E-Mail-Adresse eintragen]",
} as const;

/** Stand des Datenschutzhinweises – bei jeder inhaltlichen Änderung anpassen. */
export const PRIVACY_VERSION = "2026-11-13";
