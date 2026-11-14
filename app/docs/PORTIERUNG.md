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
| Prüfung | rPK (Simulation, Real-Klausur, Bewertung wie ein Prüfer, Ergebnisse, „Bereit für eine 1“) | **fertig (1:1)**, Abnahme 14.11.2026 (siehe unten) |
| Events | rEvents (Kapitel, Lernkarten, Abschlusstest, Belohnung) | offen |
| Tipps | rTipps, Operator-Trainer, Lernplan, Tutorial, Fehlerprotokoll | **fertig (1:1)**, Abnahme 14.11.2026 (siehe unten) |
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

### Prüfung (14.11.2026, Branch `port/pruefung`)

Logik in `src/lib/pruefung.ts` mit Tests (`pruefung.test.ts`): Fragenauswahl der Simulation (schwache Fragen zuerst,
reihum über die Themen), Aufgaben der Real-Klausur (je Kategorie bis 25 P), Uhr mit Pause, Neuladen (Uhr angehalten),
Abgeben (Antworten zählen in den Lernstand), Bewertungsstufen, Fehlerursachen ins Fehlerprotokoll, „Bereit für eine 1?“,
Operator-Hinweise. Laufende Prüfung in `store/pruefung.ts` unter `tap2coach-run` (gleiches Format wie UI.run),
Ergebnisse in `S.runs` (Format unverändert), Fehlerursachen über `CauseChips`/`logCause` aus Aufgaben.

Abnahme: Live-App und Dev-App mit demselben Lernstand (5 Ergebnisse). Damit beide **dieselbe zufällige Klausur** zeigen,
wurde der Lauf in der Live-App gestartet und `tap2coach-run` in die Dev-App kopiert. Verglichen wurde das erzeugte Markup
(Uhrzeit und gemessene Minuten maskiert) – **identisch** für: Start (Modus, Prüfungsteil, Wechsel auf Real-Klausur
setzt SoWi/Gemischt auf Planen zurück, „Bereit für eine 1?“, Ergebnisliste, Löschen mit Rückfrage) · Simulation (nach
dem Neuladen angehalten, Tasten 2/C/←/→, Klick, Fragenübersicht, letzte Frage, Rückfrage beim Abgeben – Tasten dann
gesperrt –, Weiter, Pause, Abbrechen-Rückfrage, Ergebnis mit Auswertung) · Real-Klausur Algorithmen mit SQL-Tabellen
(Antworten tippen und zwischenspeichern, HTML bleibt Text, Rückfrage, Bewerten mit Stufen, Punkte-Feld, Ursachen wählen
und abwählen, „Ergebnis speichern“ erst wenn alles bewertet, Ergebnis je Aufgabe) · zurück zur Übersicht. Lernstand,
Lernstatistik, Fehlerprotokoll (`Real-Klausur Algorithmen · 1a · <start>`) und `S.runs` nach denselben Klicks gleich.
Zeitablauf gibt automatisch ab („Zeit abgelaufen“). Fokus-Ansicht beim Schreiben, Suche dabei gesperrt, keine
Konsolenfehler, Handy (375 px) per Screenshot; lint, test, build grün.

Bewusste Unterschiede:
- Fragenauswahl: Die Live-App würfelt das Gewicht einer Frage bei jedem Vergleich im Sortieren neu (instabiler
  Vergleich), hier einmal je Frage. Gleiche Regel (rot > neu > gelb > grün, plus Zufall), nur sauber sortiert.
- Ein fertiges Ergebnis wird beim Verlassen aus `tap2coach-run` entfernt; die Live-App lässt es liegen und ignoriert es
  beim Neuladen. Sichtbar ist kein Unterschied.
- Die Zeit läuft bis zur automatischen Abgabe nur, solange die Prüfungsseite offen ist – wie in der Live-App.

Gefunden, gehört zum Grundgerüst: Die Fokus-Klasse saß an `.app`, das Stylesheet erwartet `body.focus` – auf dem Handy
blieb die Navigationsleiste während der Prüfung sichtbar. Jetzt an `<body>` wie in der Live-App. Die Lernrunde setzte
die Klasse schon selbst und war nicht betroffen. Übersicht → Lernplan „Prüfung simulieren“ wählt jetzt Modus und Teil vor
(`data-plan-sim` der Live-App).

### Tipps (14.11.2026, Branch `port/tipps`)

Vier Ansichten wie in der Live-App: Tipps (`/tipps`), Operator-Trainer (`/operatoren`), Lernplan (`/plan`), Tutorial
(`/tutorial`). Logik in `src/lib/tipps.ts` mit Tests: Fehlerprotokoll-Auswertung (errSummaryHTML, mit `CAUSE_TIP`),
schwächste Themen, Operator-Training, Kennzahlen des Tutorials, Code-Karte. Operator-Übungen und -Treppe standen in der
Live-App im Logikteil – sie kommen jetzt über `npm run catalog:export` in den Katalog (`operatoren`), nicht von Hand.
Der Lernplan nutzt das vorhandene `lib/plan.ts`; Lernplan-Knöpfe (Übersicht und Lernplan) gemeinsam in
`components/tipps/actions.ts`.

Abnahme mit gleichem Lernstand (12 beantwortete Fragen, Fehlerprotokoll mit drei Einträgen und einer unbekannten
Ursache): Markup **identisch** für Tipps (Fehlerursachen mit Tipp, Prüfungstechnik, schwächste Themen), Operator-Trainer
(Treppe, Start, Frage vor/nach richtiger und falscher Antwort, Auswertung; 12 Übungen komplett durchgeklickt, Zählung
stimmt), Lernplan (alle Tage, heute mit Knöpfen) und Übersicht. Tutorial identisch bis auf den Bildpfad (s. u.).
Knöpfe geprüft: „Los“ beim Fehlerprotokoll, Lernplan ansehen, Fällige wiederholen, Code-Karte üben, Los geht's.
Erststart ohne Lernstand öffnet das Tutorial, danach die Übersicht. Keine Konsolenfehler; lint, test, build grün.

Bewusste Unterschiede:
- Tutorial-Bild `/icons/raven.svg` statt `icons/raven.svg`: Die Dev-App hat echte Pfade (`/tutorial`), ein relativer
  Pfad würde dort ins Leere zeigen.
- Operator-Training: Die Reihenfolge der Übungen und Antworten ist (wie in der Live-App) zufällig.

Gefunden: Nach einer Antwort im Operator-Trainer bekam „Weiter“ erst im nächsten Bild den Fokus (requestAnimationFrame
läuft in Hintergrund-Tabs nicht) – jetzt per Effekt nach dem Rendern, wie die Live-App sofort.
Grundgerüst: Pfade `operatoren`, `plan`, `tutorial` ergänzt; Erststart → Tutorial (wie die Live-App ohne `#…`).
