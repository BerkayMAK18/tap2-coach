# TAP2 Coach – neue App (Branch `dev`)

> Entwicklungsstand der modularen Nachfolger-App. Die Live-App (`index.html` im Repo-Wurzelordner, Branch `main`) ist davon unabhängig. Aufbau und Herkunft: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

Eine modulare, deutschsprachige Lernapp für die Prüfungsvorbereitung als **Fachinformatiker/in Anwendungsentwicklung (FIAE)**. Im Mittelpunkt stehen ein KI-Tutor, gespeicherte Lernwege und ein persönlicher Wissensgraph. Die App orientiert sich am agentischen Lernprinzip von [LearnHarness](https://github.com/amosblomqvist/learnharness) und nutzt Inhalte aus dem [TAP2-Coach-Prototyp](https://github.com/BerkayMAK18/tap2-coach).

## Was die App sein soll

Die App soll nicht nur Fragen beantworten oder Lernkarten anzeigen. Sie soll zuerst herausfinden, was du bereits verstehst, daraus einen passenden Lernweg ableiten, fehlende Grundlagen erklären und dein Verständnis durch eigene Antworten prüfen.

**Ziel:** gezielt für die FIAE-Prüfung lernen, ohne beim erneuten Öffnen eines Themas wieder von vorne anzufangen. Funktionen, Übersicht und nachvollziehbarer Lernfortschritt sind wichtiger als dekoratives Design.

- Ausschließlich Anwendungsentwicklung, nicht Systemintegration.
- Deutsche Oberfläche in der du-Form.
- Themen in der Reihenfolge **Teil 1 → Teil 2 → Beides → SoWi**.
- Unterscheidung zwischen **Muss-Zielen** und **Sollte-Zielen**.
- Python für ausführbare Programmieraufgaben, SQL für Datenbankaufgaben; Prüfungs-Pseudocode bleibt relevant.
- Einfache, dauerhaft helle Oberfläche mit kompakter linker Navigation. Kein Dark Mode.

Der aktuell hinterlegte Prüfungstermin ist **25.11.2026**. Das ist eine Projektvorgabe, kein allgemeiner Prüfungstermin.

## Lernprinzip

Der Tutor folgt einem strukturierten Ablauf:

1. **Stand prüfen:** Diagnosefragen stellen, statt vorhandenes Wissen zu unterstellen.
2. **Weg planen:** Voraussetzungen und nächste Lernschritte passend zum belegten Stand bestimmen.
3. **Schrittweise erklären:** Theorie, Beispiele und Feedback vermitteln, ohne die Lösung einfach vorwegzunehmen.
4. **Verständnis anwenden:** Antworten und Transferaufgaben auswerten.
5. **Erkenntnisse sichern:** Nur Aussagen mit konkreten Belegen aus deinen Antworten in den Wissensgraph übernehmen.

Technisch ist das ein serverseitiger Tutor mit strukturierten, validierten Antworten und Phasensteuerung — keine Garantie für mehrere unabhängig arbeitende Agenten und keine vollständige Kopie von LearnHarness.

Der konkrete **[LearnHarness-Abgleich und Umsetzungsbedarf](docs/learnharness-abgleich.md)** dokumentiert den Referenzstand, vorhandene Ansätze, fehlende Funktionen, bewusste Unterschiede und priorisierte nächste Schritte mit Abnahmekriterien.

## Funktionen und Bereiche

| Bereich | Funktion | Bewusste Abgrenzung |
| --- | --- | --- |
| **Tutor** (`/dashboard`) | Lernziel eingeben, passende Themen auswählen und einen Lernweg starten oder fortsetzen | Kein Gesprächsarchiv auf der Tutor-Startseite |
| **Lerngespräch** (`/session/$sessionId`) | Erklärungen, Antworten, Feedback, Lernplan und Lernstand | Theorie im Chat; Aufgabenstellung und Material separat rechts |
| **Wissensgraph** (`/graph`) | Prüfungsthemen, belegte Erkenntnisse und ihre Zusammenhänge erkunden | Kein Ablageort für Quelldateien |
| **Gespräche** (`/verlauf`) | Gespeicherte Gespräche suchen und frühere Lernstände wieder öffnen | Keine Funktion zum Starten neuer Gespräche im Archiv |
| **Lernquellen** (`/lernplan`) | FIAE-Themen und Lernziele ansehen, eigene Texte und Dateien ergänzen | Quellen beschreiben Lernmaterial, nicht bewiesene Beherrschung |
| **Themenmodule** (`/modul/$topicId`) | Lernkarten, Fragen und themenbezogene Übung mit Tutor-Anbindung | Ergänzung zum Tutor, nicht die primäre Navigation |

### Tutor und KI-Bewertung

- Diagnose, individueller Lernplan, schrittweise Vermittlung und Transfer.
- Bewertung eigener Antworten mit Feedback und anschließender Fortsetzung im Tutor.
- Gespeicherte Gespräche, Pläne, Aufgabenstellungen und Lernstände bleiben beim Wiederöffnen erhalten.
- Beim Einstieg über ein bekanntes Ziel oder Thema wird ein passendes gespeichertes Gespräch wiederverwendet; ausdrücklich neue Gespräche dürfen neu beginnen.
- Optional können Gedankengang, Selbsteinschätzung und Anhänge mit einer Antwort gesendet werden.
- Markdown-Tabellen, Diagramme und optionale Demos unterstützen Aufgaben und Erklärungen. Sie sind nicht für jede Antwort garantiert.

### Wissensgraph

- Auch ohne eigene Erkenntnisse zeigt der Graph Oberkategorien und Themen aus dem Prüfungscurriculum.
- Diese Themenknoten sind Orientierung, **kein Verständnisnachweis**.
- Persönliche Erkenntnisse werden als Propositionen gespeichert; Verbindungen bilden Beziehungen von Prämissen zu Schlussfolgerungen ab.
- Lernantworten liefern die Belege. Das Hochladen einer Quelle oder Lesen einer Erklärung zählt nicht automatisch als gelernt.
- Auswahl und Filter helfen beim Erkunden; bei ausgewählten Knoten werden übrige Texte ausgeblendet, um Überlagerungen zu reduzieren.

### Lernquellen und Wiederholung

- Statische Wissensbasis mit 19 Themen sowie Lernkarten, Multiple-Choice-Fragen, offenen Fragen und Übungen.
- Eigene Texte sowie PDF-, TXT-, Markdown-, CSV- und JSON-Dateien können als persönliche Lernquellen ergänzt werden.
- Relevante Quellen werden dem Tutor als Referenzmaterial übergeben, niemals als Anweisungen oder Beherrschungsnachweise.
- Lernziele und Prioritäten berücksichtigen Lernstand, Voraussetzungen, fällige Wiederholungen und Prüfungstermin.
- Lernrunden enthalten zuerst fällige, dann neue Fragen und höchstens **20 Fragen**.
- Sicher richtige Antworten werden nach **1, 3, 7, 14 und 30 Tagen** wiederholt; falsche, geratene oder unsichere Antworten am nächsten Tag.
- Python- und SQL-Editoren führen Code lokal in einem Browser-Web-Worker aus.

## Was die App nicht ist

- Kein allgemeiner Lernassistent für sämtliche Ausbildungsberufe.
- Kein offizielles IHK-Produkt und keine Garantie für vollständigen Prüfungsumfang oder Prüfungserfolg.
- Kein vollständiges Verzeichnis des Wissens des KI-Modells. Die Lernquellen zeigen das hinterlegte und persönlich ergänzte Material.
- Kein Wissensgraph, der bereits vorhandene Themen oder importierte Unterlagen als beherrscht ausgibt.
- Keine verlässliche Musterlösung allein deshalb, weil eine KI sie erzeugt hat. Fachliche Aussagen und Bewertungen können fehlerhaft sein.

## Daten und Privatsphäre

Gespräche, Lernfortschritt, persönliche Quellen und Erkenntnisse sind kontobezogen. Die Datenzugriffe werden durch Besitzerprüfungen und Row Level Security geschützt. Anhänge und erzeugte Diagramme liegen in einem privaten Speicherbereich; die Anzeige erfolgt über signierte URLs.

Die aktuelle App verwendet persönliche App-Konten. Die öffentliche Sichtbarkeit einer späteren Veröffentlichung ist davon getrennt und muss vor dem Veröffentlichen geprüft werden. Private Speicherung bedeutet außerdem nicht, dass Material nur lokal verarbeitet wird: Tutor-Antworten und Bewertungen werden serverseitig über den KI-Dienst erzeugt.

## Technischer Überblick

- **Oberfläche:** React 19, TypeScript, TanStack Start und TanStack Router.
- **Datenabruf:** TanStack Query; Eingaben und Tutor-Ausgaben werden mit Zod validiert.
- **Design:** Tailwind CSS v4 mit eigenem UI-Baukasten (`src/ui/`) und Tokens (`src/theme/tokens.css`).
- **Backend:** Supabase (eigenes Dev-Projekt) für Konten, persönliche Daten und private Dateien; Anmeldung über GitHub.
- **KI:** serverseitig über `src/lib/ai-provider.server.ts` (Phase 0: noch nicht angebunden, Phase 3: Claude API mit Freigabeliste).
- **Code-Ausführung:** CodeMirror, Pyodide für Python und SQLite/sql.js für SQL, jeweils in einem Browser-Web-Worker.

### Orientierung im Repository

| Ort | Verantwortung |
| --- | --- |
| `src/routes/` | Seiten, Navigation und Seiten-Datenabruf |
| `src/components/learn/`, `src/components/tap/` | Tutoransicht, Lernfunktionen und Editoren |
| `src/lib/agent.server.ts` | Serverseitige Tutor- und Bewertungslogik |
| `src/lib/learn.functions.ts` | Serverfunktionen für Gespräche und Lernschritte |
| `src/lib/tutor-contract.ts` | Validierung der Lernphasen und belegten Erkenntnisse |
| `src/lib/tutor-quest.ts` | Aufgabenstellung und Material innerhalb gespeicherter Nachrichten |
| `src/lib/session-history.ts` | Suche und Wiederverwendung gespeicherter Lernwege |
| `src/lib/learning-sources*` | Persönliche Lernquellen und ihre Speicherung |
| `src/lib/graph-scaffold.ts`, `src/lib/graph-layout.ts` | Themenstruktur und Darstellung des Wissensgraphs |
| `src/lib/curriculum.ts`, `src/lib/tap2.ts` | Lernplanung, Prioritäten und Wiederholung |
| `src/content/catalogs/` | Kataloge im Bibliotheksformat (Events aus der Live-App, WPF deaktiviert) |
| `src/ui/`, `src/theme/` | Eigener UI-Baukasten und Design-Tokens |
| `docs/ARCHITEKTUR.md` | Aufbau, Herkunft der Teile, Phasenplan |
| `src/content/tap2.json` | Statische Prüfungsinhalte; bestehende Item-IDs nicht umnummerieren |
| `public/runtimes/` | Lokal bereitgestellte Python- und SQL-Laufzeiten |
| `AGENTS.md` | Technische Regeln für weitere Änderungen |
| `roadmap.md` | Aufgabenübersicht; historische Einträge sind keine aktuelle Feature-Spezifikation |

## Lokale Entwicklung und Tests

```sh
npm install
npm run dev
```

Einrichtung von Supabase, GitHub-Anmeldung und Cloudflare: `docs/ENTWICKLUNG.md`. Private Zugangsdaten gehören nicht in Quellcode oder Dokumentation.

Die vorhandenen Verhaltenstests lassen sich ausführen mit:

```sh
npm test
```

Tests decken unter anderem Wiederholungsregeln, Curriculum, Gesprächswiederaufnahme, Aufgabenmaterial, Tutor-Vertrag und Graph-Themenstruktur ab. Sie ersetzen keine Prüfung eines echten Lerngesprächs, der KI-Qualität oder der Oberfläche.

## Leitlinie für die Weiterentwicklung

Neue Funktionen müssen den Lernkreislauf verbessern: **Stand prüfen → passend planen → verstehen → anwenden → belegen → fortsetzen**. Tutor, Lernquellen und Wissensgraph bleiben klar getrennt. Vorhandene Gespräche und Belege dürfen durch Navigation, neue Quellen oder Änderungen an der Darstellung nicht verloren gehen.

Diese README beschreibt Produktziel und vorhandene Funktionen; sie ist kein Nachweis, dass jeder externe Dienst und jede KI-Ausgabe aktuell end-to-end geprüft ist.
