# LearnHarness-Abgleich und nächste Schritte

## Zweck und Stand

Dieses Dokument beschreibt, **was TAP2 Coach nach dem LearnHarness-Prinzip werden soll**, welche Teile bereits im Code vorhanden sind und welche Lücken als Nächstes geschlossen werden sollten. Es ist ein Arbeitsauftrag für spätere Entwicklung, keine Behauptung vollständiger Funktionsgleichheit.

**Abgleich:** 13.11.2026. Referenz: [LearnHarness](https://github.com/amosblomqvist/learnharness), Commit `cb25c8e49b85eed9e78315584731cad73a0118a6`.

Gelesene Originalquellen:

- [README](https://github.com/amosblomqvist/learnharness/blob/cb25c8e49b85eed9e78315584731cad73a0118a6/README.md): Measure, Plan, Teach, Practice, Gedankengang, Dateien und persistenter Wissensgraph.
- [Lehrmethodik](https://github.com/amosblomqvist/learnharness/blob/cb25c8e49b85eed9e78315584731cad73a0118a6/docs/teaching-methodology.md): kleinster sinnvoller Abhängigkeitsbaum, ein Denkschritt pro Verständnisprüfung, Plan als grobe Landkarte statt als starre Lektion.
- [Architektur](https://github.com/amosblomqvist/learnharness/blob/cb25c8e49b85eed9e78315584731cad73a0118a6/docs/architecture.md): dauerhafte Gespräche, agentische Werkzeugläufe, Streaming/Wiederaufnahme und mehrstufige Graph-Extraktion.

**Statuslegende:** „Vorhanden“ bedeutet im Quellcode erkennbar, nicht in diesem Abgleich live geprüft. „Teilweise“ bedeutet vorhandener Ansatz mit benannter Lücke. „Fehlt“ bezeichnet eine im betrachteten Tutorpfad nicht vorhandene Fähigkeit. Umsetzungsvorschläge sind unsere FIAE-Adaption, nicht automatisch Anforderungen des Originalprojekts.

## Verbindliches Produktziel

Ein persönlicher FIAE-Tutor soll vom **belegten aktuellen Verständnis** zu einem **konkreten Lernziel** führen. Er übernimmt Planung und Materialauswahl, erklärt einen Denkschritt, prüft ihn und repariert Irrtümer, bevor er darauf aufbaut. Erkenntnisse und Begründungsketten bleiben über Gespräche hinweg nutzbar. Anschließende Transferaufgaben prüfen, ob das Wissen ohne vorgegebenen Methodenhinweis abrufbar ist.

Die bestehende Trennung bleibt erhalten:

- **Tutor:** Erklärungen, Feedback und Lernsteuerung.
- **Aufgabenstellung:** aktuelle Frage und alle nötigen Daten separat vom Theoriechat.
- **Lernquellen:** Curriculum, eigene Texte und Dateien als Referenzen.
- **Wissensgraph:** Themenstruktur plus persönliche Erkenntnisse mit Herkunft; Quellen und Themen sind keine Beherrschungsnachweise.
- **Gespräche:** gespeicherte Lernwege finden und fortsetzen, nicht neue beginnen.

## Funktionsabgleich

| LearnHarness-Prinzip/Fähigkeit | TAP2 Coach heute | Was noch zu tun ist |
| --- | --- | --- |
| Measure: Ziel und Verständnisgrenzen präzise bestimmen | **Teilweise.** Diagnosephase, Lernmodell, Gedankengang und Selbsteinschätzung vorhanden | Zielkriterien, geprüfte Voraussetzungen und offene Unsicherheiten strukturiert erfassen statt nur in Freitext |
| Plan: minimaler Weg mit Abhängigkeiten | **Teilweise.** Bis zu 8 Schritte mit geprüften Vorgänger-Indizes | Grobe Planpunkte von einzelnen Denkschritten trennen; bekannte Äste auslassen und Planänderungen durch neue Diagnose begründen |
| Teach: ein Denkschritt, dann prüfen und ggf. reparieren | **Teilweise.** Prompt verlangt kleine Schritte, Rückfragen und gestufte Hinweise; Fortschritt braucht ein Evidenzfragment | Fachlich passende Evidenz für genau den aktuellen Schritt erzwingen, nicht irgendeine neue Proposition als Fortschritt zulassen |
| Practice: gesonderte, variierte Transferaufgaben ohne Methodenhinweis | **Teilweise.** `practice`-Sitzungstyp und Transferphase vorhanden | Direkter Anschluss an abgeschlossene Lehre und gezielte Auswahl aus belegtem Graphwissen; gewöhnliche `teach`-Sitzungen können heute ohne eigene Transferphase enden |
| Denken sichtbar machen | **Vorhanden.** Optionaler Gedankengang, Sicherheit und Diktat-Oberfläche | Didaktische Nutzung an echten Fehlerfällen prüfen; Sicherheit niemals als Beweis verwenden |
| Persistenter Graph aus Propositionen und Begründungsketten | **Teilweise.** Knoten, Prämissenlinks, Herkunftssitzung und exakte Text-Deduplizierung | Der Tutor liest aktuell nur die letzten 80 Aussagen, nicht deren Kanten; Belegtext wird bei Graphspeicherung nicht mitgespeichert |
| Graph über Sitzungen hinweg für Lehre und Praxis nutzen | **Teilweise.** Graph-Aussagen und gespeichertes Lernmodell gehen in Tutor-Kontext ein | Relevante Aussagen samt Prämissen, Herkunft und offenen Widersprüchen statt globalem Ausschnitt auswählen |
| Quellen/Notizen importieren | **Teilweise.** Private Quellen vorhanden; älterer `importNotes`-Pfad schreibt Notizen direkt als Propositionen | Importwissen strikt von nachgewiesenem Verständnis trennen, auch im Altpfad und bei bestehenden Notizknoten |
| Hintergrundrecherche und Werkzeuge | **Teilweise.** Websuche im Modellaufruf, optionale Diagramme und HTML-Demos | Kein vergleichbarer allgemeiner Agent-/Werkzeuglauf mit separaten Hintergrundaufgaben; zunächst Zuverlässigkeit, Herkunft und Fehlerzustände der vorhandenen Werkzeuge prüfen |
| Eigene Bilder anzeigen und annotieren | **Teilweise.** Bildanhänge können zum Modell gelangen | Kein dedizierter Ablauf zum Markieren eigener Bilder mit Pfeilen/Labels; optionaler späterer Ausbau |
| Robuste dauerhafte Agentenläufe | **Teilweise.** Antwort vor KI-Aufruf gespeichert, Wiederholungsfunktion vorhanden | Keine gleichwertige Lauf-Sperre, wiederabspielbare Ereignisse oder kontrollierte Abbruch-/Wiederaufnahmestruktur; Mehrfachaufrufe und Teilfehler absichern |
| Lange Gespräche und Graphen | **Teilweise.** Kontext begrenzt auf 60 Nachrichten und 80 Aussagen | Kontrollierte Zusammenfassung mit Referenzen statt stiller Verdrängung älterer Voraussetzungen |
| Desktop, lokale Dateien, eigene Anbieter, Plugins | **Bewusst nicht übernommen.** Cloud-Webapp mit lokalen Code-Workern | Kein Plattformwechsel erforderlich; diese Eigenschaften sind keine Voraussetzung für das Lernprinzip |

### Konkrete Code-Belege

- `src/lib/agent.server.ts`: `phaseInstructions`, `runAgent`, `assessAnswer`, `savePropositions`, `extractNotes`.
- `src/lib/tutor-contract.ts`: Planvalidierung, `evidencedPropositions`, `resolveTutorState`.
- `src/lib/learn.functions.ts`: gespeicherte Sitzung wiederverwenden, Antworten sichern, Tutor wiederholen und `importNotes`.
- `src/lib/tutor-quest.ts`: Aufgabe und Material in Nachrichten erhalten und separat darstellen.
- `src/lib/graph-scaffold.ts`: statische Kategorien/Themen ohne Speicherung als Lernerkenntnisse.
- `src/routes/_authenticated/session.$sessionId.tsx`: Chat, Aufgabenpanel, Plan, Gedankengang und Anhänge.

## Priorisierte Umsetzungsvorschläge

Diese Liste dokumentiert zukünftige Arbeiten; **keiner dieser Punkte wird durch dieses Dokument umgesetzt**. Die Reihenfolge priorisiert verlässliches Lernen vor zusätzlichen Agenten oder visuellen Funktionen.

### P0 — Belege und Lernzustand verlässlich machen

**1. Quellen von Verständnis in allen Pfaden trennen.**

- Den älteren Notizimport prüfen und auf Referenzmaterial umstellen oder Notizknoten ausdrücklich als ungeprüft behandeln.
- Bestehende `source_kind: notes`-Aussagen nicht ungeprüft als „bereits verstanden“ an den Tutor weiterreichen. Nicht still löschen oder nachträglich als bewiesen markieren.
- **Abnahme:** Ein importierter Satz beeinflusst Materialauswahl, erzeugt aber weder Beherrschungsbehauptung noch Fortschritt ohne eigene geprüfte Antwort.

**2. Erkenntnisse mit nachvollziehbarer Evidenz speichern.**

- Belegfragment, zugehörige Lernantwort/Nachricht und geprüften Lernschritt zusammen mit der Erkenntnis referenzieren.
- Das vorhandene Teilstring-Prüfen ist nur ein Herkunftsfilter: Es beweist weder fachliche Richtigkeit noch, dass eine kopierte Antwort verstanden wurde. Bewertung, Aufgabe und Schritt müssen zusammenpassen.
- **Abnahme:** Von einer Erkenntnis sind Aufgabe, eigene Antwort und Begründung auffindbar; falsche, reine Zustimmung oder aus der Theorie kopierte Antworten lösen keinen Fortschritt aus.

**3. Groben Lernplan und feine Verständnisprüfungen entkoppeln.**

- Mehrere kleine Prüfungen innerhalb eines Planpunkts erlauben. Ein Planpunkt gilt erst nach seinen konkreten Zielkriterien als abgeschlossen.
- Präzise Diagnose festhalten: Was ist belegt, widerlegt, nur vermutet oder noch ungeprüft? Neue Lücken dürfen zur begründeten Plananpassung führen.
- **Abnahme:** Ein korrekter Nebenaspekt überspringt keinen offenen Kernschritt; bei einem Irrtum bleibt der Tutor am betroffenen Denkschritt.

### P1 — Graphgestützte Fortsetzung und Transfer

**4. Relevante Begründungsketten abrufen.**

- Für das Lernziel passende Graphknoten inklusive Prämissen und Herkunft laden. Ähnliche Aussagen und Widersprüche prüfen statt nur wortgleiche Duplikate entfernen.
- Bei Unsicherheit erneut diagnostizieren; vorhandene Erkenntnisse sind hilfreiche Belege, keine unfehlbaren Wahrheiten.
- **Abnahme:** Eine neue Sitzung nutzt eine passende ältere Begründung auch außerhalb der letzten 80 Knoten und erklärt nichts unnötig neu.

**5. Transfer als echten Anschluss an Lehre anbieten.**

- Aus Tutor oder Abschluss eines Lernwegs eine gesonderte Übung zu belegtem Wissen starten/fortsetzen, nicht aus dem Gesprächsarchiv.
- Aufgaben variieren und Methode nicht im Aufgabentext verraten; Fehlermuster führen zu abgestuften Hinweisen oder Rückkehr zur betreffenden Grundlage.
- **Abnahme:** Nach einer Normalisierungslektion kann eine neue Datenstruktur ohne „Benutze 3NF“-Hinweis bearbeitet werden; eine Lösung eines bekannten Beispiels allein beendet den Transfer nicht.

**6. Quellenwirkung end-to-end prüfen.**

- Text, textbasiertes PDF und nicht lesbare Datei getrennt testen. Relevanzzuordnung darf nicht nur zufällig von einer Themen-ID im Zieltext abhängen.
- Fachliche Verwendung der Quelle kenntlich machen; ungelesene oder abgeschnittene Inhalte nicht als vollständig verarbeitet ausgeben.
- **Abnahme:** Der Tutor nutzt eine passende eigene Quelle nachvollziehbar, ignoriert darin enthaltene Anweisungen zum Überspringen der Diagnose und meldet Lesefehler verständlich.

### P2 — Zuverlässige längere Lernläufe

**7. Gleichzeitige Aufrufe und Teilfehler absichern.**

- Pro Sitzung einen aktiven Lauf, idempotente Wiederholung und eindeutige Zustände für gespeicherte Antwort, KI-Lauf, Erkenntnisse und Abschluss vorsehen.
- **Abnahme:** Doppeltes Senden, Neuladen oder ein Fehler zwischen Nachricht-, Zustand- und Graphspeicherung erzeugen keine doppelten Schritte und verlieren keine Antwort.

**8. Lange Kontexte kontrolliert erhalten.**

- Ältere Gespräche mit überprüfbaren Referenzen zusammenfassen; aktuelles Material, Diagnose und offene Voraussetzungen zuverlässig behalten.
- **Abnahme:** Ein Gespräch mit mehr als 60 Nachrichten kann weiterlernen, ohne eine ältere offene Lücke zu vergessen oder erneut bei null zu beginnen.

**9. Werkzeuge nach Nutzen ausbauen.**

- Vorhandene Recherche, Diagramme und Demos erst auf konsistente Daten, Quellen, Laufzeit und Fehlermeldungen prüfen.
- Danach bei konkretem Bedarf Hintergrundrecherche, Bildannotation oder einen getrennten Extraktions-/Prüflauf ergänzen. Mehrere Agenten nur, wenn ihre Aufgabe und ihr Mehrwert messbar sind.
- **Abnahme:** Material passt zur aktuellen Aufgabe; ein fehlgeschlagenes Diagramm blockiert nicht den gespeicherten Lernweg.

## Bewusste Unterschiede zum Original

- LearnHarness ist allgemein und desktoporientiert; TAP2 Coach bleibt eine FIAE-Webapp auf TanStack Start und Supabase.
- LearnHarness beschreibt lokale Speicherung und Dateipfade. Hier werden persönliche Dateien privat hochgeladen und für benötigte KI-Verarbeitung freigegeben; keine Offline-Garantie.
- LearnHarness kann Notizen als Wissensstruktur importieren. Hier darf importierte Struktur nicht mit nachgewiesenem Verständnis verwechselt werden.
- LearnHarness betont Struktur statt Fähigkeitsscores. Hier ergänzen Prüfungsbewertung und Wiederholung den Graph; Punkte, Wiederholungsboxen und Selbsteinschätzung sind keine Graphbeweise.
- LearnHarness versteht „offensichtlich wahr“ als Lernziel. Hier ist das didaktische Richtung, keine objektiv messbare Wahrheit: eigene Begründung und Transfer bleiben die prüfbaren Kriterien.
- Keine Übernahme von Dark Mode, Desktop-Host, Anbieterwahl oder Plugin-System nur um Funktionsgleichheit zu behaupten.
- Vor tatsächlicher Übernahme von Originalcode ist die AGPL-3.0-Lizenz samt Pflichten zu prüfen; dieser Abgleich importiert keinen Originalcode und ersetzt keine Rechtsberatung.

## Prüfstrategie für spätere Umsetzung

Für jeden umgesetzten Punkt konkrete Verhaltenstests ergänzen und ausführen, danach einen angemeldeten Ablauf prüfen: **Quelle → Diagnose → Plan → Erklärung/Prüfung → belegter Graphknoten → Wiederöffnen → Transfer**. Fehlerantwort, kopierte Lösung, fremde Daten, Neuladen und fehlgeschlagener KI-Lauf gehören zu den Gegenproben.

Vorhandene Tests in `src/lib/*.test.ts` sind die Ausgangsbasis, kein Nachweis für diese noch offenen Abnahmekriterien. Den Status hier nach Umsetzung mit Testbeleg aktualisieren; nicht allein wegen eines neuen Prompts als vollständig markieren.