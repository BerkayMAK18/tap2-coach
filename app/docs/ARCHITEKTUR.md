# Architektur der neuen App (Branch `dev`)

Stand: 13.11.2026, Phase 0. Dieses Dokument hält fest, **was wo liegt und warum**, damit jede spätere
Änderung nachvollziehbar bleibt. Bei Architekturänderungen bitte hier mitpflegen.

## Grundregel: Live-App bleibt unberührt

| | Live-App | Neue App |
| --- | --- | --- |
| Branch | `main` | `dev` |
| Code | `index.html` (Single-File-PWA) im Repo-Wurzelordner | `app/` |
| Hosting | GitHub Pages (`berkaymak18.github.io/tap2-coach`) | Cloudflare (eigene Adresse, z. B. `tap2-coach-dev.<konto>.workers.dev`) |
| Deploy | GitHub Action, nur bei Push auf `main` | Cloudflare, nur aus `dev` (noch nicht eingerichtet) |
| Daten | `localStorage` + verschlüsselter Sync über das Live-Supabase-Projekt | eigenes Supabase-Dev-Projekt |

Warum eigene Adresse statt eines Unterordners auf github.io: Gleiche Origin hieße gemeinsamer
`localStorage` und gemeinsamer Service Worker. Die neue App könnte dann Lernstände der Live-App
überschreiben. Mit eigener Origin ist das technisch ausgeschlossen.

Die neue App **liest** die Live-Inhalte nur (Export-Skript), sie schreibt nie in `index.html`.

## Herkunft: Fusion aus drei Apps

| Quelle | Übernommen | Nicht übernommen |
| --- | --- | --- |
| **tap2-coach** (Live) | Fragen, Karten, Aufgaben, Events als Kataloge; Frage-IDs; Farbpalette; Rabe-Icon | – (bleibt als Live-App bestehen) |
| **learnlab** (Lovable-Demo) | Gesamter Stack: TanStack Start, Tutor-Logik (Diagnose → Plan → Erklären → Transfer), Wissensgraph, Lernquellen, Python/SQL-Editor, Tests | Lovable-Cloud-Auth, Lovable-AI-Gateway, Lovable-Vite-Plugins, Firmen-Designsystem samt Schriften und Logos |
| **bi-study-buddy** (Lovable) | Ideen für Phase 2: Lehrjahr → Block → Lernfeld, Kann-Listen, Klausurkalender, Lückentexte, Schwierigkeitsstufen | Glücksrad, Noten, Firmen-SSO, Firmenfarben |

### Was beim Kopieren von learnlab ersetzt wurde

- **Designsystem:** Die Vorlage band ein firmeninternes Designsystem mit proprietären Schriften ein.
  Das darf nicht in ein öffentliches Repo. Ersetzt durch:
  - `src/ui/index.tsx`: eigener UI-Baukasten mit derselben API (Button, Card, Icon, Tabs, Sheet …),
    damit die übernommenen Seiten unverändert importieren können (`@/ui`).
  - `src/theme/tokens.css`: eigene Farbwerte (aus der Live-App) und freie Schriften (SIL OFL).
  - Klassennamen wurden per `sed` umbenannt, z. B. `darkGreen → ink`, `bi-<farbe> → tone-<farbe>`.
- **Anmeldung:** nur GitHub über `supabase.auth.signInWithOAuth({ provider: "github" })` mit PKCE.
  E-Mail/Passwort und `/reset-password` der Vorlage sind entfernt.
- **KI:** `src/lib/ai-provider.server.ts` ersetzt das Gateway mit derselben Schnittstelle
  (`generateResponse`, `generateImage`). Aktuell ein Platzhalter, der „nicht angebunden“ meldet.
- **Laufzeiten:** Pyodide und sql.js werden nicht mehr eingecheckt, sondern von
  `scripts/copy-runtimes.mjs` aus `node_modules` kopiert (vor `dev` und `build`).
- **Entfernt, weil ungenutzt:** Admin-Client mit `service_role`, Cron-Authentifizierung, drizzle-kit (Schema wird per SQL eingespielt).
- **Favicon:** Lovable-Logo entfernt, Rabe-Icon der Live-App.

## Aufbau

```
app/
├─ scripts/
│  ├─ copy-runtimes.mjs          Python/SQL-Laufzeiten nach public/runtimes kopieren
│  └─ export-legacy-catalog.mjs  Events aus ../index.html → src/content/catalogs/*.json
├─ public/runtimes/              Web-Worker für Code-Ausführung (Laufzeiten sind gitignored)
├─ src/
│  ├─ ui/                        Eigener UI-Baukasten (ersetzt Firmen-Designsystem)
│  ├─ theme/                     Tokens + Schriften
│  ├─ content/
│  │  ├─ tap2.json               Kerninhalte TAP2 (Karten, MC, offene Fragen, Aufgaben)
│  │  └─ catalogs/               Kataloge im Bibliotheksformat (zuerst: Events)
│  ├─ lib/                       Fachlogik: Tutor, Wiederholung, Curriculum, Graph (+ Tests)
│  ├─ routes/                    Seiten (TanStack Router, dateibasiert)
│  └─ integrations/supabase/     Supabase-Client, Auth-Middleware
├─ drizzle/migrations/           Datenbankschema (Tabellen + Row Level Security)
└─ wrangler.jsonc                Cloudflare-Worker-Konfiguration
```

## Inhalte als Kataloge

Ziel ist eine **Katalog-Bibliothek**: beliebig viele Lernkataloge (TAP1, TAP2, Lernfelder, Klausuren,
Events), filterbar nach Name und Tags. Phase 0 legt das Format fest:

- `src/content/catalogs/index.json`: Verzeichnis aller Kataloge (id, Titel, Art, `enabled`, Fragenzahl).
- `src/content/catalogs/<datei>.json`: ein Katalog mit `schema: 1`, Metadaten, Kapiteln und Items.
- **Item-IDs sind heilig.** Sie sind die Schlüssel für den Lernstand (`item_progress`). Die IDs der Live-App
  bleiben exakt erhalten (`k:<deck><n>`, `m<i>`, `o<i>`, `ev:<event>:<frage>`), damit Lernstände später
  übernommen werden können. Nie umnummerieren, gelöschte IDs nie neu vergeben.
- `enabled: false` blendet einen Katalog aus, ohne ihn zu löschen. **WPF PM ist so deaktiviert**
  (Schalter `DISABLED` in `scripts/export-legacy-catalog.mjs`). Die Live-App ist davon nicht betroffen.

Aktualisieren nach Änderungen an der Live-App: `npm run catalog:export`.

## Konten und Zugriff

- Lernen soll ohne Konto möglich sein (Phase 1: Lernstand lokal, Konto nur für Sync).
  **Stand Phase 0:** Die übernommenen Seiten unter `src/routes/_authenticated/` verlangen noch eine Anmeldung.
- Anmeldung über GitHub (Supabase Auth). Alle Tabellen sind per Row Level Security auf `user_id` beschränkt.
- KI-Funktionen nur für freigeschaltete Supabase-Nutzer-IDs (`TUTOR_ALLOWED_USER_IDS`, serverseitig in
  `assertTutorAllowed`; nicht die GitHub-ID aus `user_metadata`, die Nutzer selbst ändern können). Der KI-Schlüssel liegt nur als Cloudflare-Secret vor.

## Sicherheit

Checkliste und Übersicht der Schutzmaßnahmen: `docs/ENTWICKLUNG.md` → „Sicherheit“.

## Phasenplan

| Phase | Inhalt | Stand |
| --- | --- | --- |
| 0 | Gerüst auf `dev`: Stack aus learnlab, eigenes Design, GitHub-Login, Katalogformat, Doku | **erledigt** |
| 1 | Lernen ohne Konto, Katalog-Bibliothek (Suche/Filter), Events mit Belohnungen, Gamification aus der Live-App, Übernahme alter Lernstände per Import | offen |
| 2 | Struktur Lehrjahr → Lernfeld (bi-study-buddy), Kann-Listen, Klausurkalender, TAP1-Kataloge | offen |
| 3 | KI-Tutor über Claude API, nur Allowlist, Tageslimit | offen |
| 4 | Entscheidung: neue App ersetzt Live-App (gleiche Origin, Migration der Lernstände) | offen |
