/** Navigation wie in der Live-App (Reihenfolge, Beschriftung, Icons aus dem Markup von index.html). Generiert, nicht von Hand ändern. */
export const NAV_MAIN = [
 {
  "view": "start",
  "svg": "<path d=\"M3 11l9-8 9 8\"/><path d=\"M5 9.5V21h14V9.5\"/><path d=\"M10 21v-6h4v6\"/>",
  "label": "Übersicht"
 },
 {
  "view": "lernen",
  "svg": "<path d=\"M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2V5z\"/><path d=\"M4 19a2 2 0 0 1 2-2h14\"/>",
  "label": "Lernen"
 },
 {
  "view": "aufgaben",
  "svg": "<path d=\"M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z\"/><path d=\"M13.5 6.5l4 4\"/>",
  "label": "Aufgaben"
 },
 {
  "view": "pruefung",
  "svg": "<circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 9v4l2.5 2.5\"/><path d=\"M9 2h6\"/>",
  "label": "Prüfung"
 },
 {
  "view": "events",
  "svg": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 10h18M8 3v4M16 3v4\"/><path d=\"M12 12.5l1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3z\"/>",
  "label": "Events"
 },
 {
  "view": "rangliste",
  "svg": "<path d=\"M8 21h8\"/><path d=\"M12 17v4\"/><path d=\"M7 4h10v5a5 5 0 0 1-10 0V4z\"/><path d=\"M17 5h3v2a3 3 0 0 1-3 3\"/><path d=\"M7 5H4v2a3 3 0 0 0 3 3\"/>",
  "label": "Rangliste"
 },
 {
  "view": "tipps",
  "svg": "<path d=\"M9 18h6M10 21h4\"/><path d=\"M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z\"/>",
  "label": "Tipps"
 }
] as const;
export const VTITLE: Record<string, string> = { "start": "Übersicht", "lernen": "Lernen", "aufgaben": "Aufgaben", "pruefung": "Prüfung", "tipps": "Tipps", "einstellungen": "Einstellungen", "tutorial": "So lernst du mit dem Coach", "operatoren": "Operator-Trainer", "plan": "Lernplan", "belohnungen": "Belohnungen", "rangliste": "Rangliste", "events": "Events", "patchnotes": "Patch Notes", "datenschutz": "Datenschutz" };
export const NAV_FOOT = [{"view": "patchnotes", "svg": "<path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"/><path d=\"M14 3v5h5M9 13h6M9 17h4\"/>", "label": "Patch Notes"}] as const;
