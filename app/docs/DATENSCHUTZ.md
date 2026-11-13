# Datenschutz-Konzept (DSGVO)

Stand: 13.11.2026. Leitlinie: **Privacy by Design** (Art. 25 DSGVO) – so wenig Daten wie möglich, und was der
Betreiber nicht lesen muss, kann er auch nicht lesen. Kein Ersatz für eine Rechtsberatung.

Der Text für Nutzerinnen und Nutzer steht in der App unter `/datenschutz` (`src/routes/datenschutz.tsx`).
Er zeigt nur Abschnitte aktiver Funktionen (`FEATURES` in `src/config.ts`). **Beim Freischalten einer Funktion
diesen Hinweis und dieses Dokument mitpflegen.**

## Grundsätze

1. **Lernen ohne Konto.** Ohne Anmeldung verlässt der Lernstand den Browser nie.
2. **Ende-zu-Ende-Verschlüsselung im Konto.** Die Anmeldung mit GitHub dient nur der Zuordnung, der Lernstand
   wird im Browser verschlüsselt. Der Betreiber sieht in der Datenbank nur Zeichensalat.
3. **Pseudonyme Rangliste.** Nur ein selbst gewählter Benutzername, nur mit Einwilligung, jederzeit löschbar.
4. **Kein Tracking**, keine Analyse, keine Drittanbieter-Ressourcen (Schriften, Skripte liegen lokal).
5. **Löschen per Knopf** für alles (lokal, Konto, Sicherung, Rangliste).

## Verarbeitungsübersicht (Art. 30 DSGVO, vereinfacht)

| Verarbeitung | Daten | Wo | Rechtsgrundlage | Wer kann lesen | Löschung |
| --- | --- | --- | --- | --- | --- |
| Auslieferung der App | IP, Zeit, Datei, User-Agent | Cloudflare (AV) | Art. 6 (1) f | Cloudflare (Logs) | Fristen des Anbieters |
| Lernstand lokal | Antworten, Markierungen, Ergebnisse, Belohnungen | Browser (localStorage) | § 25 (2) Nr. 2 TDDDG, Art. 6 (1) b | nur Nutzer | Einstellungen → zurücksetzen |
| Konto (optional) | GitHub-ID, -Name, E-Mail, Avatar-URL | Supabase Auth, Frankfurt (AV) | Art. 6 (1) b | Betreiber im Dashboard (unvermeidbar) | Konto löschen |
| Sicherung/Sync (optional) | **verschlüsselter** Lernstand, Version, Zeitstempel | Supabase DB, Frankfurt | Art. 6 (1) b | niemand außer Nutzer (Schlüssel nur im Browser) | Konto/Sicherung löschen; Tagesstände max. 10 Tage |
| Rangliste (optional) | Benutzername, Level, XP, Figur, Einwilligungszeitpunkt | Supabase DB, Frankfurt | Art. 6 (1) a | alle Nutzer (nur diese Felder) | Austragen / Konto löschen |
| Patch Notes (optional) | IP an GitHub | GitHub (USA, DPF) | Art. 6 (1) f | GitHub | – |
| KI-Tutor (nur Admin) | Eingaben des Admins | Anthropic (USA) | – (nur eigene Daten des Betreibers) | Anthropic | nach Anbieter |

AV = Auftragsverarbeitung. **Zu erledigen:** Auftragsverarbeitungsvertrag (DPA) mit Supabase im Dashboard
abschließen (Organization → Legal Documents) und Cloudflare-DPA akzeptieren (Teil der Cloudflare-Bedingungen).

## Technische Umsetzung

### Konto (GitHub über Supabase Auth)
- Nur der Provider GitHub, E-Mail-Registrierung im Dashboard **aus**, anonyme Anmeldung **aus**.
- Die App nutzt ausschließlich `auth.uid()`. GitHub-Name und E-Mail werden nirgends in eigene Tabellen kopiert.
- Anmelde-Token im localStorage (technisch notwendig, kein Einwilligungsbanner nötig).

### Ende-zu-Ende-verschlüsselter Sync
- Tabelle `sync_state (user_id uuid PK = auth.uid(), rev int, blob text, updated_at)` mit RLS
  „nur eigene Zeile“. Dazu `sync_history` (ein Stand pro Tag, 10 Tage) wie in der Live-App.
- `blob` = AES-GCM-verschlüsselter Lernstand. Schlüssel: 160 Bit Zufall, erzeugt im Browser, **nie zum Server**.
  Übertragung auf weitere Geräte per Kurzcode/QR (bewährtes Verfahren der Live-App, PBKDF2-geschützt).
- Zusammenführen wie in der Live-App (`syncMerge`): pro Frage gilt der neuere Stand, nichts geht verloren.
- Vorteil gegenüber dem bisherigen Schlüssel-Sync: Daten sind zusätzlich an das Konto gebunden (RLS),
  Bremsen pro Konto statt global, Konten sperr- und löschbar.

### Rangliste
- Tabelle `leaderboard (user_id PK, username unique, xp, level, look, consent_at)`; lesbar für alle nur über eine
  Funktion, die **keine** `user_id` herausgibt. Benutzername wird beim ersten Mitmachen gewählt (Regeln wie bisher:
  3–16 Zeichen, keine reservierten Namen), Teilnahme nur mit aktiver Einwilligung (Häkchen, nicht vorausgewählt).
- XP-Plausibilitätsgrenzen serverseitig wie bisher (nur steigend, Tageslimit).

### Konto löschen
- Supabase Edge Function `delete-account`: prüft das JWT, löscht Sync-Daten, Ranglisten-Eintrag und den Auth-Nutzer
  (dafür braucht die Funktion den Service-Key – er liegt nur als Secret in der Edge Function, nie im Frontend).

### KI-Tutor (Premium, vorerst nur Admin)
- Supabase Edge Function `tutor` mit Claude API, Schlüssel als Supabase-Secret.
- Zugriff nur, wenn `app_metadata.role = 'admin'` im geprüften JWT steht. `app_metadata` können Nutzer **nicht**
  selbst ändern (nur mit Service-Key). Die Rolle wird einmalig für das eigene Konto gesetzt.
- Im Frontend ist der Tutor für alle anderen unsichtbar; maßgeblich ist aber nur die Prüfung im Server.
- Vor einer späteren Bezahl-Option nötig: Einwilligung/Information zur Übermittlung an Anthropic (USA),
  DPA mit Anthropic, Impressum, AGB, Zahlungsanbieter.

## Offene Punkte vor der Veröffentlichung

- [ ] Verantwortlicher und Kontaktadresse in `src/config.ts` (`CONTROLLER`) eintragen.
- [ ] DPA mit Supabase abschließen, Cloudflare-DPA prüfen.
- [ ] Supabase: E-Mail-Provider und anonyme Anmeldung aus, nur GitHub an.
- [ ] Impressum: Für ein privates, kostenloses Angebot in der Regel nicht vorgeschrieben (§ 5 DDG gilt für
      geschäftsmäßige, meist entgeltliche Dienste). Spätestens mit einer Bezahl-Option Pflicht.
- [ ] Live-App (`main`): denselben Hinweis als Seite ergänzen (dort fehlt bisher ein Hinweis in der App).
