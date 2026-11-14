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
| Events | rEvents (Kapitel, Lernkarten, Abschlusstest, Belohnung) | **fertig (1:1)**, Abnahme 14.11.2026 (siehe unten) |
| Tipps | rTipps, Operator-Trainer, Lernplan, Tutorial, Fehlerprotokoll | **fertig (1:1)**, Abnahme 14.11.2026 (siehe unten) |
| Belohnungen/Rangliste | Original-Modul eingebettet | fertig (1:1) |
| Einstellungen | Darstellung, App & Offline, Geräte-Sync, Übertragen (Link/QR), Sicherung, Hilfe, Datenschutz | **fertig (1:1) bis auf Geräte-Sync**, Abnahme 14.11.2026 (siehe unten) |
| Patch Notes | Release-Liste von GitHub | **fertig (1:1)**, Abnahme 14.11.2026 (siehe unten) |

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

### Events (14.11.2026, Branch `port/events`)

`/events` (Liste) und `/events?ev=<id>` (Event-Seite). Logik in `src/lib/events.ts` mit Tests: Kapitel- und gemischte
Runden, Abschlusstest (Freischaltung ab 80 % gelb/grün je Kapitel, 15 Auswahlfragen, aus jedem Kapitel mindestens zwei),
Status-Text, Bestehen ab 80 % sicher richtig, Kapitel gemeistert. Die Belohnung vergibt weiter das Original-Modul
(`gm("evFinal")`, `gm("evKap")`, Vorschau `gm("evPreview")`). In der Lernrunde: Ergebnis des Abschlusstests auf der
Endkarte, Kapitel-Meldung, „Nächste Runde“ und „Fertig“ zurück ins Event.

Abnahme mit gleichem Lern- **und Belohnungsstand** (`tap2coach-gami` übernommen): Markup **identisch** für Einleitung,
Event-Karte, Event-Seite (Abschlusstest gesperrt und frei, Tipps, 7 Kapitel mit „Kurz erklärt“ und Abbildungen) –
einziger Unterschied ist eine laufende ID im SVG der Figur aus dem Belohnungs-Modul (`gm4s`/`gm8s`). Kapitel-Runde und
Abschlusstest durchgespielt: Endkarte mit Ergebnis-Hinweis gleich aufgebaut, bestes Ergebnis landet im Belohnungsstand,
„Fertig“ führt zurück ins Event, „Nächste Runde“ startet bei gesperrtem Test nichts – beides wie in der Live-App.
Keine Konsolenfehler; lint, test, build grün.

Bewusste Unterschiede:
- Die Liste zeigt nur LF11a: WPF PM ist im Export abgeschaltet (`enabled: false`, Entscheidung in ARCHITEKTUR.md),
  die Live-App zeigt beide.

Gefunden, gehört zum Grundgerüst: TanStacks `Link` setzt bei aktiver Route selbst `aria-current="page"` – während einer
Runde unter `/lernen/runde` war „Lernen“ immer mitmarkiert (bei Event-Runden zusätzlich zu „Events“). Die Menü-Links
gelten jetzt nur bei exakt gleichem Pfad als aktiv, sonst gilt unsere Markierung wie in der Live-App (`navView`).

### Patch Notes (14.11.2026, Branch `port/patchnotes`)

Logik in `src/lib/patchnotes.ts` mit Tests: API-Antwort → Releases (Entwürfe raus, Datum aus „*Veröffentlicht am …*“,
nur GitHub-Links), Sortierung, Zwischenspeicher `tap2coach-patch` (Format der Live-App, beim Lesen entschärft) und das
kleine Markdown. Release-Texte sind Fremddaten: Die Live-App setzt sie als HTML ein, hier entsteht daraus eine
Struktur, die React als Text rendert – mit demselben DOM (auch die Unterliste als `ul` direkt in der Liste).

Abnahme: Beide Apps laden die echten Releases (32) – Markup und Zwischenspeicher **identisch**. Fehlerfall (GitHub nicht
erreichbar, Kopie älter als 10 Minuten): gleicher Hinweis, Liste aus der letzten Kopie, identisch. Keine Konsolenfehler;
lint, test, build grün. Die CSP (`public/_headers`) erlaubt `api.github.com` bereits.

### Einstellungen (14.11.2026, Branch `port/einstellungen`)

Wie rSettings() der Live-App: Darstellung (wie System/Hell/Dunkel, `tap2coach-theme`), App & Offline (installieren,
offline bereit, iPhone-Hinweis; `store/pwa.ts`), Auf anderes Gerät übertragen (Link + QR), Dein Fortschritt (Sicherung
im Live-Format **inklusive Belohnungen** und Sync-Schlüssel, Laden mit Belohnungen zusammenführen, Zurücksetzen mit
Rückfrage – trennt auch Sync und verwirft eine laufende Prüfung), Hilfe (App-Version, Tutorial, Patch Notes, gemeldete
Fehler), Datenschutz-Link. Übertragen-Logik in `src/lib/transfer.ts` mit Tests – **gleiches Binärformat wie die
Live-App**; QR-Code mit derselben Bibliothek (`qrcode-generator` 1.4.4, jetzt npm-Abhängigkeit statt `vendor/`).
Ein Start über `…#import=…` öffnet die Einstellungen mit der Übernahme-Frage (txReceive).

Abnahme (gleicher Stand): Markup **identisch** für Darstellung (auch nach Hell/Dunkel), Übertragen (vor und nach dem
Erstellen, Übernahme-Frage, „übernommen“), Fortschritt (auch Rückfrage), Hilfe, Datenschutz-Link. **Links quer
geprüft:** Ein Live-Link in der Dev-App ergibt dieselbe Zusammenfassung wie in der Live-App selbst und umgekehrt;
Zusammenführen gleich. Sicherungsdatei mit denselben Feldern (`app, exportiert, data, gami`). App & Offline im
Produktions-Build „Offline nutzbar“ (im Entwicklungsmodus ohne Service Worker „wird eingerichtet …“, wie die
Live-App ohne sw.js). Keine Konsolenfehler; lint, test, build grün.

Bewusste Unterschiede:
- Link-Adresse: Ursprung + `/` (die Dev-App hat echte Pfade), die Live-App nimmt Ursprung + Pfad.
- Beim Lesen eines Links wird die Box-Stufe auf 0–5 begrenzt (die Live-App übernimmt beliebige Werte, `normalize`
  fängt das erst später ab).
- **Geräte-Sync:** Die Sync-Karte der Live-App (Sync einschalten, Gerät per Code/QR koppeln, Schlüssel anzeigen,
  Cloud-Kopie löschen, Testzugang lokal) ist **noch nicht portiert**. Bis dahin stehen dort die bisherigen Karten der
  neuen App (Verbinden mit Schlüssel, Konto). Lokal ohne Supabase-Zugang zeigt die Dev-App keine Sync-Karte, die
  Live-App den „Testzugang“.
- Datenschutzhinweis: Markup der Live-App, **Inhalt der neuen App** (Cloudflare, Konto, Funktionsschalter). Ergänzt:
  Übertragungs-Links/QR und „Fehler melden“ (beides gibt es jetzt), Stand 14.11.2026. **Korrigiert:**
  `FEATURES.patchNotes` stand auf `false`, obwohl die portierten Patch Notes von GitHub laden – damit fehlte der
  Abschnitt im Hinweis. Jetzt `true`; Verarbeitungsübersicht in DATENSCHUTZ.md ergänzt.
