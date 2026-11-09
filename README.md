# TAP2 Prüfungscoach

Lern-App für die Abschlussprüfung Teil 2 (Fachinformatiker/in Anwendungsentwicklung): Karteikarten, Quiz, Übungsaufgaben mit Musterlösung und Probeklausuren unter Zeitdruck.

**Online nutzen:** über den GitHub-Pages-Link dieses Repos (Settings → Pages).

## Als App installieren und offline nutzen

- **Android/Chrome:** In den Einstellungen unter „App & Offline“ auf „App installieren“ tippen (oder im Browser-Menü „App installieren“).
- **iPhone/iPad:** In Safari auf „Teilen“ → „Zum Home-Bildschirm“.
- **Lernstand auf ein anderes Gerät übertragen:** Einstellungen → „Auf anderes Gerät übertragen“ → QR-Code scannen oder Link öffnen → „Zusammenführen“. Ohne Konto und ohne Server, der Stand steckt im Link. iPhone-App vom Home-Bildschirm: Link kopieren und in der App unter „Link oder Code hier einfügen“ einfügen.
- Nach dem ersten Besuch funktioniert der Coach auch ohne Internet. Bei einer neuen Version erscheint der Hinweis „Neue Version verfügbar“.

## Datenschutz

- Keine Anmeldung, kein Tracking, keine externen Server.
- Dein Lernfortschritt wird nur lokal in deinem Browser gespeichert (`localStorage`).
- Für einen Geräte- oder Browserwechsel: Übersicht → „Sicherung herunterladen“ und auf dem anderen Gerät „Sicherung laden“.
- Code-Editor ([CodeMirror](https://codemirror.net)), SQLite ([sql.js](https://github.com/sql-js/sql.js)) und QR-Code-Erzeugung ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)), alle MIT-Lizenz, liegen ebenfalls im Repo (`vendor/`).
- Übertragungs-Links enthalten nur den Lernstand (keine Namen o. Ä.) und werden nirgends gespeichert.
- Schriften sind lokal eingebunden (SIL Open Font License), es gibt keine Verbindung zu Google.

## Fehler gefunden?

In jeder Lernfrage gibt es oben ein Fahnen-Symbol, in jeder Übungsaufgabe den Link „Fehler melden“. Beides öffnet ein vorausgefülltes [Issue](../../issues) mit Frage-ID und Text, du musst nur noch beschreiben, was falsch ist. Dafür brauchst du einen kostenlosen GitHub-Account. Meldungen sind öffentlich sichtbar.

## Bedienung

- **Suche:** Lupe oben rechts oder Taste `/` (bzw. `Strg/Cmd + K`)
- **Code-Karten:** Bei Pseudocode- und SQL-Karten tippst du deine Lösung in einen Editor und vergleichst sie dann mit der Musterlösung (`Strg/Cmd + Enter`).
- **SQL ausführen:** SQL-Karten laufen mit SQLite direkt im Browser gegen eine Beispiel-Datenbank (`Shift + Enter`). Bei vielen Karten wird dein Ergebnis automatisch mit der Musterlösung abgeglichen.
- **Wiederholungen:** Richtig beantwortete Fragen kommen nach 1, 3, 7, 14 und 30 Tagen wieder. „Weiterlernen“ startet zuerst die fälligen Wiederholungen.
- **Einstellungen:** Zahnrad oben rechts – Hell/Dunkel, App installieren, Sicherung speichern/laden, Fortschritt zurücksetzen
- **Tipps:** Prüfungstechnik und deine schwächsten Themen
- **Tutorial:** Lernpfad bis zur Prüfung und Spickzettel aller Funktionen
- **Lernplan:** verteilt alle offenen Fragen bis zur Prüfung auf die Tage; die Übersicht zeigt, was heute dran ist
- **Operator-Trainer:** unter Tipps – wie ausführlich bei „Nennen“, „Erläutern“, „Beurteilen“ geantwortet werden muss
- **Ehrlich einschätzen:** „Unsicher“ bzw. „War geraten“ – die Frage kommt morgen wieder
- **Fehlerprotokoll:** Punktverluste einer Ursache zuordnen, Auswertung unter Tipps
- **Themen kombinieren:** unter Lernen mehrere Themen anhaken und gemeinsam üben
- **Timer:** Übungsaufgaben starten mit der Prüfungszeit, danach läuft der Timer ins Minus

## Inhalte

Alle Aufgaben und Lösungen sind eigenständig im Stil der IHK-Prüfung formuliert. Original-Prüfungen und Lösungshinweise sind nicht enthalten.

## Aktualisieren – ohne dass der Lernstand verloren geht

Neue Version als `index.html` ersetzen, committen, pushen. Eine GitHub Action prüft vor jedem Veröffentlichen, ob der Lernstand aller Nutzer erhalten bleibt, und **stoppt den Deploy**, wenn nicht. Lokal vorab prüfen:

```bash
node tools/check-ids.js
```

Regeln, weil der Lernstand an der Position der Fragen hängt:

- Fragen **nur am Ende anhängen** (Auswahlfragen ans Ende von `MC`, Karten ans Ende eines Decks) – nie mittendrin einfügen, löschen oder umsortieren.
- Text, Antworten und Erklärungen einer Frage an gleicher Stelle ändern ist erlaubt. Eine Frage, die weg soll: Inhalt ersetzen statt löschen.
- Interne Namen nicht ändern: Themen-IDs (`T01` …), Deck-Namen (`sql`, `algo` …), Aufgaben-IDs (`P1` …), Speicherschlüssel `tap2coach`.
- `</script>` in einem Fragetext als `<\/script>` schreiben.
- Die Adresse (`berkaymak18.github.io`) beibehalten – der Lernstand gehört zur Domain.

Der Prüfungstermin steht im Code als `EXAM_DAY`.
