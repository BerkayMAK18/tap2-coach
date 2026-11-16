/**
 * SoWi-Karteikarten als Auswahlfragen (nur in der neuen App, nicht aus dem Export der Live-App).
 *
 * In der Prüfung ist SoWi reines Multiple Choice. Darum werden SoWi-Karten beim Lernen als Auswahlfrage gezeigt:
 * richtig ist die Musterantwort der Karte, dazu je drei falsche, aber fachlich plausible Antworten (falsche Fristen,
 * Zahlen, Paragrafen, Zuständigkeiten …). Frage-ID und Fortschritt bleiben unverändert (lib/sowi-mc.ts).
 */
import { T11 } from "./t11";
import { T12 } from "./t12";
import { T13 } from "./t13";
import { T14 } from "./t14";
export { SOWI_RIGHT } from "./right";

export const SOWI_DISTRACTORS: Record<string, [string, string, string]> = { ...T11, ...T12, ...T13, ...T14 };
