# Migration: neue App ersetzt die Live-App – ohne dass jemand etwas verliert

Stand: 13.11.2026. Verbindliche Leitplanken für alle Änderungen auf `dev`. Ziel: Lernstand, XP/Level, Federn, Tickets,
Skins, Titel, Event-Belohnungen, Sync und **Ranglisten-Einträge** der heutigen Nutzer laufen nahtlos weiter.

## 1. Gleiche Adresse beim Umstieg (wichtigster Punkt)
Die neue App wird am Ende unter **derselben Adresse** wie die Live-App ausgeliefert (`berkaymak18.github.io/tap2-coach`,
oder beide ziehen gemeinsam auf eine eigene Domain mit Weiterleitung). Dann übernimmt der Browser automatisch alles aus
dem localStorage – niemand muss etwas tun. Dafür gilt dauerhaft:
- Speicherschlüssel bleiben gleich: `tap2coach` (Lernstand v7), `tap2coach-gami` (Belohnungen), `tap2coach-sync`
  (Sync-Schlüssel), `tap2coach-lb` (Ranglisten-Token/Name), `tap2coach-theme`, `tap2coach-sess`, `tap2coach-run`.
- Formate bleiben gleich oder werden in `normalize()` bzw. im Belohnungs-Modul migriert (mit Test „echter Stand
  bleibt unverändert“). Frage-IDs ändern sich nie.
- Der Service Worker der neuen App ersetzt den alten sauber (gleicher Scope, Update-Hinweis wie heute).

## 2. Rangliste: dieselbe Tabelle weiterverwenden
- **Kein** neues `app_leaderboard`. Die neue App nutzt `tap2_lb` und deren Funktionen (`tap2_lb_join/push/top/leave`)
  mit **derselben ID-Ableitung** wie die Live-App: `sha256("tap2-lb|s|" + Sync-Schlüssel)` bzw.
  `sha256("tap2-lb|t|" + Gerätetoken aus tap2coach-lb)`. Name, XP, Level, Figur und Platz bleiben erhalten.
- XP-Regeln (nur steigend, Tageslimit, Bremsen) bleiben serverseitig gleich.
- Konto-Bindung später nur **additiv**: optionale Spalte `user_id` in `tap2_lb` + Funktion „Eintrag mit Konto
  verknüpfen“ (Nachweis über die geheime ID, die nur das eigene Gerät kennt). Bestehende Funktionen bleiben unverändert.

## 3. Belohnungen (XP-System, Gacha)
- Das Belohnungs-Modul wird 1:1 portiert: gleiche Item-/Skin-/Titel-IDs, gleiche Regeln, gleicher Speicher
  `tap2coach-gami`, gleiches Packformat für Sync und Übertragung.
- **Spiegelung (v2.8, Live-App und Dev-App gleich):** Das Packformat ist nur **erweitert** (`k` Konto, `lc` Login-Tag,
  `qd` Tagesquests, `r` Serie/aktive Boosts, `u` Zeitpunkt) – ältere Versionen ignorieren die Felder und arbeiten wie
  bisher. Im Stand liegt dazu `kb` (Eingänge/Ausgänge von Federn, Tickets, Boosts) und `u`. Regeln nur gemeinsam in
  beiden Apps ändern; die Golden-Tests prüfen, dass beide gleich rechnen.

## 4. Sync: alter Schlüssel-Sync → Konto-Sync
- Verschlüsselung und Inhaltsformat sind identisch (`seal({ v: 1, s, g, ev, at })`). Die neue App schreibt deshalb
  ebenfalls `g` (Belohnungen) und `ev` (Lösch-Ereignisse) in den Sync, sobald diese Module portiert sind.
- „Alten Sync übernehmen“: Wer schon den Schlüssel-Sync der Live-App nutzt, meldet sich an; die App liest mit dem
  vorhandenen Schlüssel (`tap2coach-sync`) aus `tap2_sync`, führt zusammen und speichert ins Konto (`app_sync`).
  Ohne Konto läuft der bisherige Schlüssel-Sync einfach weiter.

## 5. Weitere Wege (falls jemand das Gerät wechselt)
- Sicherungsdatei und Übertragungs-Link/QR: gleiches Format in beiden Apps (Laden ist in der neuen App schon möglich).

## 6. Reihenfolge des Umstiegs (später)
1. Neue App erreicht Funktionsgleichheit inkl. Belohnungen, Rangliste, Sync, Übertragen (Tabelle in ARCHITEKTUR.md).
2. Test mit kopierten echten Ständen (Sicherungsdateien von Freiwilligen) – Ergebnis muss identisch sein.
3. Ankündigung in den Patch Notes, Hinweis „Sicherung herunterladen“ eine Woche vorher.
4. Umschalten der Adresse, Live-App-Datei als Rückfall behalten.
