# Architektur der neuen App (Branch `dev`, Ordner `app/`)

Stand: 13.11.2026. Dieses Dokument hält fest, **was wo liegt und warum**. Bei Architekturänderungen bitte mitpflegen.

## Ziel

Eine **kostenlos betreibbare** Nachfolgerin der Live-App (`index.html` auf `main`), die genauso funktioniert,
aber modular und skalierbar ist: viele Kataloge (TAP1, TAP2, Lernfelder, Klausuren, Events), getrennte Module,
Tests, typsicherer Code. Später optional: KI-Tutor, Katalog-Bibliothek, Konten.

## Grundregel: Live-App bleibt unberührt

| | Live-App | Neue App |
| --- | --- | --- |
| Branch | `main` | `dev` |
| Code | `index.html` (Single-File-PWA) | `app/` |
| Hosting | GitHub Pages | statisches CDN, z. B. Cloudflare Pages Free (eigene Adresse) |
| Daten | `localStorage` der Live-Adresse | `localStorage` der neuen Adresse (getrennt) |

Eigene Adresse statt Unterordner auf github.io: gleiche Origin hieße gemeinsamer Speicher und Service Worker.
Die neue App liest die Live-Inhalte nur über das Export-Skript, sie schreibt nie in `index.html`.

## Stack (Entscheidung 13.11.2026)

| Schicht | Wahl | Begründung |
| --- | --- | --- |
| Build | Vite 8, TypeScript strict | schnell, Standard, gute Fehlermeldungen |
| UI | React 19, eigener UI-Baukasten (`src/ui`), Tailwind v4 mit eigenen Tokens | wiederverwendbare Bausteine, kein Firmen-Branding |
| Routing | TanStack Router, dateibasiert (`src/routes`), automatische Code-Aufteilung | typsichere Links und Suchparameter, skaliert mit vielen Seiten |
| Zustand | Zustand (`src/store`) | klein, ohne Boilerplate, einfach testbar |
| Inhalte | JSON-Kataloge (`src/content/generated`), Schema mit Zod (`src/content/schema.ts`) | Inhalte getrennt vom Code, Grundlage der Katalog-Bibliothek |
| Offline | vite-plugin-pwa (Workbox, Precache) | wie die Live-App nach dem ersten Besuch offline nutzbar |
| Tests | Vitest | Engine, Datenmodell, Kataloge |
| Hosting | statisch (Cloudflare Pages Free: unbegrenzter Traffic) | kein Server, keine laufenden Kosten, weltweit schnell |
| Sync/Rangliste | später: Supabase Free, dasselbe verschlüsselte Protokoll wie die Live-App | optional, Lernen geht immer ohne |

**Warum nicht mehr TanStack Start + Cloudflare Workers (Phase 0)?** Der Server war für den KI-Tutor da (Login,
Server-Funktionen, Datenbank-Tabellen). Für eine kostenlose Version ohne KI ist ein Server unnötig, macht Offline
schwerer und verursacht Kosten bei vielen Nutzern. Der Tutor-Code liegt in der Git-Historie (Commit `2909805`)
und kommt in Phase 3 als **eigenes Modul** zurück (eigener Worker mit Freigabeliste, siehe unten).

## Aufbau

```
app/
├─ index.html                     Einstieg (Vite)
├─ public/_headers                Sicherheits-Header + CSP für Cloudflare Pages
├─ scripts/export-legacy-catalog.mjs   ../index.html → src/content/generated/*.json (nur lesen)
├─ src/
│  ├─ main.tsx                    Router starten
│  ├─ config.ts                   Prüfungsdatum, Speicher-Schlüssel
│  ├─ routes/                     Seiten (eine Datei = eine Route); routeTree.gen.ts wird erzeugt
│  ├─ content/
│  │  ├─ schema.ts                Katalog-Format (Zod)
│  │  ├─ catalog.ts               Zugriff: Themen, Fragen, Abbildungen, Events
│  │  ├─ catalog.test.ts          Prüft Format, eindeutige IDs, ID-Schema der Live-App
│  │  └─ generated/               Exportierte Kataloge (eingecheckt, nicht von Hand ändern)
│  ├─ lib/
│  │  ├─ state.ts (+test)         Lernstand-Format = Live-App v7, Migration, Absicherung von Fremddaten
│  │  ├─ srs.ts (+test)           Wiederholungs-Engine (Leitner) und Runden-Logik wie in der Live-App
│  │  ├─ lernen.ts, plan.ts (+test) Runden zusammenstellen, „Als Nächstes“, Lernplan
│  │  ├─ search.ts, sql.ts (+test) Suche über alle Fragen, SQL ausführen und vergleichen
│  │  ├─ editor.ts                Code-Editor (CodeMirror), nur bei Bedarf geladen
│  │  └─ dates.ts, utils.ts
│  ├─ store/progress.ts           Lernstand + laufende Runde (localStorage, mehrere Tabs)
│  ├─ ui/                         UI-Baukasten
│  └─ theme/                      Tokens, Schriften, Abbildungs-Styles
```

## Datenmodell und Kompatibilität

- Der Lernstand hat **exakt das Format der Live-App** (Version 7, Schlüssel `tap2coach`). Folgen:
  - Sicherungsdateien der Live-App lassen sich hier laden (Einstellungen → Sicherung laden) und umgekehrt.
  - Später kann derselbe Sync genutzt und die Live-App ohne Datenverlust ersetzt werden.
- **Frage-IDs sind heilig:** `m<i>`, `k:<deck><i>` (ab 0), `o<i>`, `ev:<event>:<frage>`. `catalog.test.ts` prüft das.
  Achtung: Die frühere `tap2.json` aus learnlab zählte Karten ab 1 und war deshalb nicht kompatibel. Sie ist ersetzt.
- Alles von außen (Sicherung, später Link/Sync) läuft durch `normalize()`: Typen werden erzwungen, echte Daten
  bleiben unverändert (Test: „lässt einen echten Lernstand exakt unverändert“).

## Inhalte und Katalog-Bibliothek

- Quelle der Inhalte ist vorerst die Live-App. `npm run catalog:export` erzeugt die Kataloge neu,
  `npm run catalog:check` (Teil von `npm run build`) bricht ab, wenn sie nicht mehr zur `index.html` passen.
- `src/content/generated/index.json` ist das Katalog-Verzeichnis (Grundlage der späteren Bibliothek mit Suche/Filter).
- Events: `enabled: false` blendet einen Katalog aus. **WPF PM ist deaktiviert** (Schalter im Export-Skript).
- Abbildungen (UML, Netzplan, Gantt …) sind fertige SVGs aus dem eigenen Katalog und werden direkt eingefügt.
  Sie stammen nie aus Nutzerdaten.

## Portierung aus der Live-App

| Bereich | Live | Neu | Hinweis |
| --- | --- | --- | --- |
| Übersicht (Countdown, Reife je Teil, Lernplan heute, Gezielt üben) | ✓ | ✓ | 1:1 (PORTIERUNG.md) |
| Lernen: Themen, Runden (20 Fragen, Einstreuen), Fällig/Fehler/Markiert/Zufall, Mehrfachauswahl | ✓ | ✓ | |
| Theorie aus Lernpaketen | ✓ | ✓ | 1:1 inkl. Timer, Notation, Ziele |
| Abbildungen in Antworten | ✓ | ✓ | |
| Sicherung laden/speichern (gleiches Format) | ✓ | ✓ | inkl. Rücklage des alten Stands |
| Offline/PWA, Hinweis „Neue Version“ | ✓ | ✓ | |
| Suche | ✓ | ✓ | `lib/search.ts` |
| Eigene Karten anlegen/löschen | ✓ | ✓ | Löschen mit Sync-Ereignis |
| SQL-Karten ausführen (sql.js, Vergleich mit Musterlösung), Code-Editor | ✓ | ✓ | `lib/sql.ts`, `lib/editor.ts`, eigene Chunks |
| Aufgaben (20 Übungsaufgaben, Timer, Punkte, Fehlerursachen) | ✓ | ✓ | `lib/aufgaben.ts`, 1:1 (PORTIERUNG.md) |
| Prüfung (Simulation, Real-Klausur, Noten, „Bereit für eine 1“) | ✓ | ✓ | `lib/pruefung.ts`, `store/pruefung.ts`, 1:1 (PORTIERUNG.md) |
| Tipps, Operator-Trainer, Lernplan, Tutorial | ✓ | ✓ | `lib/tipps.ts`, Operator-Daten im Katalog, 1:1 (PORTIERUNG.md) |
| Events (LF11a) | ✓ | – | Daten vorhanden |
| Belohnungen (XP, Level, Quests, Kalender, Tiere, Skins, Titel) | ✓ | – | eigenes Modul, Format `tap2coach-gami` übernehmen |
| Rangliste, Geräte-Sync | ✓ | – | Supabase, gleiches Protokoll |
| Übertragen per Link/QR | ✓ | – | |
| Patch Notes, Hell/Dunkel | ✓ | – | |

Jeder Bereich ist ein eigenes Modul (Route + Logik in `lib/` + Tests) und kann unabhängig portiert werden.

## Entscheidungen vom 13.11.2026 (Abend)

- **Design und Bedienung exakt wie die Live-App.** Das Stylesheet der Live-App wird zum Design-System der neuen App,
  die React-Komponenten erzeugen dasselbe Markup (gleiche Klassen). Einzige Änderung: Die Tintenfarbe `#08312A`
  der Live-App (Boehringer-Markenfarbe) wird durch einen neutralen Ton ersetzt (Standard: `#172033`, eine Zeile in
  den Tokens). Der bisherige eigene UI-Baukasten (`src/ui`) wird schrittweise ersetzt.
- **Gamification/Gacha vollständig** als eigenes Modul (`tap2coach-gami`, gleiches Format).
- **Optionales Konto mit GitHub** (Supabase, Frankfurt) für Sicherung, Sync und Rangliste – Lernen ohne Konto bleibt.
- **Datenschutz:** Der Lernstand im Konto ist Ende-zu-Ende-verschlüsselt, der Betreiber kann ihn nicht lesen;
  Rangliste nur mit selbst gewähltem Benutzernamen und Einwilligung. Details: `docs/DATENSCHUTZ.md`.
- **KI-Tutor als Premium-Funktion**, vorerst nur für den Admin (`app_metadata.role = 'admin'`), für andere unsichtbar,
  umgesetzt als Supabase Edge Function. Bezahl-Option später.

## Phasenplan

| Phase | Inhalt | Stand |
| --- | --- | --- |
| 0 | Gerüst aus learnlab, eigenes Design, Katalogformat | erledigt, Stack am 13.11. auf statische PWA umgestellt |
| 1a | Design der Live-App übernehmen, Datenschutzhinweis | **in Arbeit**: Datenschutzhinweis fertig |
| 1b | Funktionsgleichheit inkl. Gamification/Gacha (Tabelle oben) | in Arbeit: Lernen fertig |
| 1c | Konto (GitHub), E2E-Sync, Rangliste mit Benutzername, Konto löschen | offen (braucht Supabase-Dev-Projekt + GitHub-OAuth-App) |
| 2 | Katalog-Bibliothek (Suche/Filter, mehrere Kataloge), TAP1, Lehrjahr → Lernfeld, Klausurkalender | offen |
| 3 | KI-Tutor (Premium, nur Admin): Stufe 1 Wissensgraph fertig (`/tutor`), Stufe 2 KI siehe `docs/TUTOR.md` | Stufe 2 offen (braucht Login + Claude-API-Key) |
| 4 | Neue App ersetzt die Live-App (gleiche Origin, Lernstände bleiben) | offen |

## Sicherheit

- Keine Server-Logik, keine Geheimnisse im Frontend. Sicherheits-Header und CSP in `public/_headers`.
- Fremddaten nur über `normalize()`. React escaped alle Texte; HTML wird nur für eigene Katalog-Abbildungen eingefügt.
- Checkliste für Supabase (sobald Sync/Rangliste portiert sind): `docs/ENTWICKLUNG.md` → „Sicherheit“.
