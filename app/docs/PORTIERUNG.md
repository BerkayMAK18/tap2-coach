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
| Lernen | Übersicht (rStart), Lernen (Themen, Themenseite, Runde rSess), Suche, SQL-/Code-Karten, eigene Karten | Logik da, Markup offen |
| Aufgaben | rUeb (20 Aufgaben, Timer, Punkte, Fehlerursachen) | offen |
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
