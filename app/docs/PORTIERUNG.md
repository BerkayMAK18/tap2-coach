# Portierung: Live-App → React (Weg B, Entscheidung 13.11.2026)

Ziel: Die neue App (`dev`) entspricht der Live-App (`main`) in **jeder Funktion und im Design** – gebaut in React/TypeScript
mit Tests. Erst danach neue Funktionen. Referenz ist immer `../index.html` auf `main` (bzw. `git show main:index.html`).

## Paritätsregeln (gelten für jede portierte Ansicht)

1. **Gleiches Markup, gleiche Klassen.** Das Stylesheet der Live-App ist das Design-System (`src/theme/main.css`).
   Komponenten erzeugen dieselben Elemente und Klassen wie die Template-Strings der Live-App (z. B. `section.card`,
   `.row`, `.btn small primary`, `.chip`, `.ring`). Keine Tailwind-Optik in portierten Ansichten.
2. **Gleiche Texte.** Überschriften, Hinweise, Knöpfe 1:1 (Deutsch, du-Form). Abweichungen nur mit Grund im Kommentar.
3. **Gleiche Logik.** Regeln (Lernstand, XP, Bewertung, Lernplan …) als reine Funktionen in `src/lib/`, mit Tests,
   die das Verhalten der Live-App festhalten. Speicherformate/IDs unverändert (siehe MIGRATION.md).
4. **Gleiche Icons.** `<Ic name="…"/>` nutzt die Icon-Pfade der Live-App aus dem Katalog (`TAP2.icons`).
5. **Sicherheit.** Texte als React-Text (escaped). HTML nur für eigene Katalog-Inhalte (Icons, Abbildungen) oder das
   eingebettete Original-Belohnungsmodul. Fremddaten nur über `normalize()`/`clean*`.
6. **Abnahme je Ansicht:** Live-App und Dev-App nebeneinander öffnen (gleicher Lernstand per Sicherung), Screenshot-
   Vergleich Desktop + Handy, Bedienablauf einmal komplett durchklicken, keine Konsolenfehler. Ergebnis unten eintragen.

## Module und Stand

| Modul | Ansichten (Live-App) | Stand |
| --- | --- | --- |
| Grundgerüst | Seitenleiste, Kopfzeile (Ring, Tage, Figur, Suche, Einstellungen), Hell/Dunkel | in Arbeit |
| Lernen | Übersicht (rStart), Lernen (Themen, Themenseite, Runde rSess), Suche, SQL-/Code-Karten, eigene Karten | **fertig (1:1)**, Abnahme 13.11.2026 (siehe unten) |
| Aufgaben | rUeb (20 Aufgaben, Timer, Punkte, Fehlerursachen) | **fertig (1:1)**, Abnahme 14.11.2026 (siehe unten) |
| Prüfung | rPK (Simulation, Real-Klausur, Bewertung wie ein Prüfer, Ergebnisse, „Bereit für eine 1“) | offen |
| Events | rEvents (Kapitel, Lernkarten, Abschlusstest, Belohnung) | offen |
| Tipps | rTipps, Operator-Trainer, Lernplan, Tutorial, Fehlerprotokoll | offen |
| Belohnungen/Rangliste | Original-Modul eingebettet | fertig (1:1) |
| Einstellungen | Darstellung, App & Offline, Geräte-Sync, Übertragen (Link/QR), Sicherung, Hilfe, Datenschutz | teilweise |
| Patch Notes | Release-Liste von GitHub | offen |

## Vorgehen

- Pro Modul ein Branch von `dev`, Ergebnis per Pull Request nach `dev`. Module berühren nur ihre eigenen Dateien
  (`src/routes/<modul>*`, `src/lib/<modul>*`, `src/components/<modul>/`), gemeinsame Teile (`Ic`, `Ring`, Shell) liegen
  in `src/ui-main/` und werden nur im Grundgerüst geändert.
- Inhalte (Fragen, Aufgaben, Lernpakete, Events, Abbildungen, Icons) kommen aus `src/content/generated/`; fehlt etwas
  (z. B. Operator-Drills, SQL-Beispieldatenbank, Tipps-Texte, die in der Live-App in der Logik stehen), wird es im
  Export-Skript ergänzt – nie von Hand kopiert.

## Abnahmen

### Lernen (13.11.2026, Branch `port/lernen`)

Live-App (`main`, lokal) und Dev-App nebeneinander mit demselben Test-Lernstand (34 beantwortete Fragen, 2 markiert,
1 eigene Karte). Verglichen wurde das erzeugte Markup jeder Ansicht (Elemente, Klassen, Texte, Attribute, Styles) –
**identisch** für: Übersicht · Themenliste (Filter, Mehrfachauswahl, Auswahlleiste) · Themenseite (Theorie mit Timer
und Notation, Fragen mit „Eigene Frage“ und Lösch-Bestätigung, Aufgaben) · Lernrunde (Auswahlfrage vor/nach dem
Aufdecken, nach der Antwort, „War geraten“; Wissensfrage mit eigener Antwort, aufgedeckt, „Vorherige Frage …“;
Code-Karte; SQL-Karte mit Ausführen, Musterlösungs-Vergleich, Tabellen ansehen, Aufdecken) · Rundenende · Suche
(leer, Treffer in Themen/Fragen/Aufgaben, keine Treffer, eigene Karten). Lernstand nach denselben Klicks gleich
(z. B. „War geraten“ → Box 1, gelb, morgen). Desktop und Handy (375 px) per Screenshot geprüft, keine Konsolenfehler,
Produktions-Build mit SQL (WebAssembly) und Editor getestet.

Bewusste Unterschiede:
- Reihenfolge der Antwortoptionen ist (wie in der Live-App) zufällig.
- CodeMirror ist eine neuere Version: Editor-internes Markup weicht ab, Optik und Tastenkürzel gleich.
- Suche: Pfeil ↓/Enter im Suchfeld springen zum ersten Treffer. In der Live-App blockiert der globale Tasten-Handler
  diese Tasten (stopPropagation in der Capture-Phase) – hier behoben, sonst gleich.
- Links in noch nicht portierte Bereiche (Aufgaben, Tutorial/Lernplan/Operator-Trainer → Tipps, Prüfungssimulation,
  Event-Runden) führen auf deren Seite; sie öffnen dort noch nicht die konkrete Aufgabe bzw. Simulation.

Gefunden, gehört zum Grundgerüst: Tailwind erzeugte eine Utility `.ring` (1-px-Schatten) und überlagerte die
Ring-Klasse der Live-App – in `styles.css` ausgeschlossen (`@source not inline("ring")`). Fußzeile (`footer.foot`) ergänzt; mit
Geräte-Sync lautet ihr Text „… in diesem Browser gespeichert und verschlüsselt mit deinen Geräten abgeglichen“
(bewusst anders als „nur lokal“, weil dann eine verschlüsselte Kopie auf dem Server liegt). Offen im Grundgerüst: Monospace-Schrift (AppMono) zeigt Fettdruck im Editor schwächer als JetBrains Mono.

### Aufgaben (14.11.2026, Branch `port/aufgaben`)

Neu gebaut auf `port/lernen` (der ältere Cloud-Patch lag nicht vor). Logik in `src/lib/aufgaben.ts` mit Tests
(`aufgaben.test.ts`): Gruppen, Chip-Farbe, Punkte-Eingabe, Speichern, Fehlerprotokoll (`logCause`, `CAUSES`,
`CAUSE_TIP`), „Fehler melden“. Bausteine `CauseChips` (auch für die Real-Klausur) und `UebItem` (auch auf der Themenseite).

Live-App (`main`, lokal) und Dev-App nebeneinander mit demselben Test-Lernstand (3 bearbeitete Aufgaben, eine mit
Ursache). Verglichen wurde das erzeugte Markup (Elemente, Klassen, Texte, Attribute, Styles; Uhrzeiten maskiert) –
**identisch** für: Liste · Aufgabe vor dem Start · ohne Zeitmessung · Musterlösung · Ursache abwählen / neu wählen ·
Punkte über dem Maximum speichern (auf max begrenzt) · zurück zur Liste · Timer läuft · gestoppt · Lösung nach dem
Stopp · Timer zurücksetzen · SQL-Aufgabe mit Tabellen. „Fehler melden“-Link gleich. Lernstand und Fehlerprotokoll nach
denselben Klicks gleich. „Theorie: …“ öffnet das Thema im Reiter Theorie, Themenseite und Suche öffnen direkt die
Aufgabe (`/aufgaben?u=<id>`). Handy (375 px) per Screenshot geprüft, keine Konsolenfehler; lint, test, build grün.

Bewusste Unterschiede:
- Ursache abwählen: Die Live-App speichert `cause: null`, hier fehlt der Schlüssel. `normalize()` (beide Apps)
  entfernt `null` beim Laden ohnehin; der Sync überträgt bei Aufgaben nur Punkte und Datum.
- Die Aufgabe steht in der Adresse (`?u=S1`), ist also verlinkbar; Zurück im Browser führt zur Liste.

Gefunden, gehört zum Grundgerüst: Unter Windows (Git `core.autocrlf`) meldete `catalog:check` die Kataloge als
veraltet (CRLF in `../index.html`) – das Export-Skript vereinheitlicht jetzt die Zeilenenden. `state.test.ts` verglich
das lokale Datum mit dem UTC-Datum und schlug nachts fehl – korrigiert.
