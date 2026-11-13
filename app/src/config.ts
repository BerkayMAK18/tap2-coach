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
