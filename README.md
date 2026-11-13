# TAP2 Prüfungscoach

Lern-App für die Abschlussprüfung Teil 2 (Fachinformatiker/in Anwendungsentwicklung): Karteikarten, Quiz, Übungsaufgaben mit Musterlösung und Probeklausuren unter Zeitdruck.

**Online nutzen:** über den GitHub-Pages-Link dieses Repos (Settings → Pages).

## Als App installieren und offline nutzen

- **Android/Chrome:** In den Einstellungen unter „App & Offline“ auf „App installieren“ tippen (oder im Browser-Menü „App installieren“).
- **iPhone/iPad:** In Safari auf „Teilen“ → „Zum Home-Bildschirm“.
- **Lernstand auf ein anderes Gerät übertragen:** Einstellungen → „Auf anderes Gerät übertragen“ → QR-Code scannen oder Link öffnen → „Zusammenführen“. Ohne Konto und ohne Server, der Stand steckt im Link. iPhone-App vom Home-Bildschirm: Link kopieren und in der App unter „Link oder Code hier einfügen“ einfügen.
- Nach dem ersten Besuch funktioniert der Coach auch ohne Internet. Bei einer neuen Version erscheint der Hinweis „Neue Version verfügbar“.

## Datenschutz

- Keine Anmeldung, kein Tracking. Ohne Geräte-Sync gibt es keine Verbindung zu externen Servern – außer beim Öffnen der Seite „Patch Notes“, die die Release-Liste direkt von GitHub lädt (öffentliche Daten, ohne Anmeldung).
- Dein Lernfortschritt wird nur lokal in deinem Browser gespeichert (`localStorage`).
- Für einen Geräte- oder Browserwechsel: Übersicht → „Sicherung herunterladen“ und auf dem anderen Gerät „Sicherung laden“.
- Code-Editor ([CodeMirror](https://codemirror.net)), SQLite ([sql.js](https://github.com/sql-js/sql.js)) und QR-Code-Erzeugung ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)), alle MIT-Lizenz, liegen ebenfalls im Repo (`vendor/`).
- Übertragungs-Links enthalten nur den Lernstand (keine Namen o. Ä.) und werden nirgends gespeichert.
- **Geräte-Sync (freiwillig):** Wer ihn in den Einstellungen einschaltet, dessen Lernstand wird im Browser verschlüsselt (AES-GCM) und so bei Supabase abgelegt. Der Server kennt weder Namen noch E-Mail noch den Schlüssel, nur eine Prüfsumme davon. Der Stand auf dem Gerät bleibt immer erhalten; „Kopie in der Cloud löschen“ entfernt die Daten vom Server.
- **Rangliste (freiwillig):** Wer unter „Rangliste“ einen Spitznamen wählt, erscheint mit Name, Level, XP und Figur für alle sichtbar. Sonst wird nichts übertragen. „Austragen“ löscht den Eintrag sofort.
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
- **Lernrunden:** enthalten nur offene und fällige Fragen (höchstens 20). Unter Lernen gibt es für ausgewählte Themen eigene Runden nur mit Fehlern, fälligen oder neuen Fragen.
- **Geräte synchronisieren:** Einstellungen → „Sync einschalten“, auf dem zweiten Gerät den Kurzcode eingeben oder den QR-Code scannen. Danach gleichen sich die Geräte selbst ab, ohne Konto.
- **Rangliste:** im Menü unter „Rangliste“ einen Spitznamen wählen. Sortiert nach gesammelten XP; verbundene Geräte teilen sich einen Eintrag.
- **Belohnungen:** Figur oben rechts – XP und Level nur für sicher richtige Antworten (Serien ×1,5 bis ×3; „unsicher“ oder „geraten“ gibt nichts und beendet die Serie), täglich 5 Quests, Login-Kalender, Schatzkammer mit 5 Tieren à 40 Skins und Garderobe. Federn gibt es nur durchs Lernen, kein Echtgeld.
- **Events:** im Menü unter „Events“ – zeitlich begrenzte Lernaktionen zu Klausuren (zurzeit LF11a und WPF Projektmanagement). Jedes Kapitel hat eine Kurz-Lektion mit Diagramm, danach Auswahl- und Klausurfragen. Sitzen 80 % je Kapitel, schaltet sich ein Abschlusstest frei (15 Fragen, ab 80 % bestanden). Die Sonderbelohnung (Baum-Shirt bzw. Titel „AZB Experte“) gibt es nur bis zum Klausurtermin. Events zählen nicht zur Prüfungsreife, geben aber XP.
- **Patch Notes:** unten links im Menü (am Handy unter Einstellungen → Hilfe) – alle Versionen mit Datum, neueste zuerst.
- **Titel:** in der Garderobe – lustige IT- und Azubi-Titel, freigeschaltet durch Fortschritt oder Events, sichtbar in der Rangliste.

## Inhalte

Alle Aufgaben und Lösungen sind eigenständig im Stil der IHK-Prüfung formuliert. Original-Prüfungen und Lösungshinweise sind nicht enthalten.

Die Event-Fragen sind eigenständig formuliert und orientieren sich an den Themen der jeweiligen Lernsituation bzw. des Workshops; Unterrichtsmaterial selbst ist nicht enthalten. Neue Events kommen als Eintrag in `EVENTS` dazu. Frage-IDs dort sind fest vergeben und dürfen nie geändert oder gelöscht werden (`check-ids` prüft das).

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
- Belohnungen liegen getrennt unter `tap2coach-gami` und lesen den Lernstand nur. Skins nur anhängen, nie umbenennen (Besitz hängt an den IDs). Übertragung und Sicherung führen Belohnungen immer zusammen, nie ersetzen.
- Geräte-Sync: Server einrichten mit `tools/supabase-sync.sql` (SQL Editor → Run), dann Projekt-URL und **Publishable key** als Repo-Secrets `SYNC_URL` und `SYNC_ANON` anlegen (Settings → Secrets and variables → Actions). Die Action setzt sie beim Veröffentlichen ein; im Repo bleiben die Werte leer, ohne Secrets ist der Sync ausgeblendet. Die Action bricht ab, wenn versehentlich der Secret key eingetragen ist. Lokal gibt es dafür den „Testzugang“ in den Einstellungen. Der Abgleich führt immer zusammen (`syncMerge`); Löschungen laufen über Ereignisse (`syncEv`), damit sie nicht zurückkommen. Neue Felder im Lernstand brauchen dort eine Zusammenführ-Regel.
- Rangliste: Server einrichten mit `tools/supabase-leaderboard.sql`. XP können serverseitig nur steigen (höchstens 30.000 pro Tag), unpassende Namen im Table Editor (`tap2_lb`) löschen.
- Sicherheit: Beim Veröffentlichen trägt `tools/csp.js` eine Content-Security-Policy ein. Erlaubt sind nur die eigenen Skripte (per SHA-256) und Verbindungen zu Supabase und zur GitHub-API. Veröffentlicht werden nur die App-Dateien (`_site`), keine Werkzeuge. Neue externe Dienste oder Inline-Skripte brauchen eine Anpassung in `tools/csp.js`, sonst blockiert der Browser sie. Alle Ausgaben fremder Daten (Übertragungslink, Sicherung, Rangliste, Patch Notes) laufen über `esc()`.
- SQL-Skripte sind idempotent. Nach Änderungen beide im SQL Editor erneut ausführen. Sie bremsen Massenanfragen: höchstens 60 neue Sync-Stände und 30 neue Ranglisten-Einträge pro Stunde, höchstens 300 Fehlversuche beim Kurzcode in 10 Minuten. Im Supabase-Dashboard unter Authentication die Registrierung neuer Nutzer abschalten, denn die App nutzt keine Konten.

Der Prüfungstermin steht im Code als `EXAM_DAY`.
