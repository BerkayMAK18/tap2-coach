# Datenschutz-Konzept (DSGVO)

Stand: 13.11.2026. Leitlinie: **Privacy by Design** (Art. 25 DSGVO) – so wenig Daten wie möglich, und was der
Betreiber nicht lesen muss, kann er auch nicht lesen. Kein Ersatz für eine Rechtsberatung.

Der Text für Nutzerinnen und Nutzer steht in der App unter `/datenschutz` (`src/routes/datenschutz.tsx`).
Er zeigt nur Abschnitte aktiver Funktionen (`FEATURES` in `src/config.ts`). **Beim Freischalten einer Funktion
diesen Hinweis und dieses Dokument mitpflegen.**

## Grundsätze

1. **Lernen ohne Konto.** Ohne Anmeldung verlässt der Lernstand den Browser nie.
2. **Zwei Wege zum Synchronisieren (Entscheidung 14.11.2026):**
   - **Mit Konto:** „Ein Konto, ein Stand“. Der GitHub-Login reicht, der Lernstand liegt im Konto und ist durch
     Anmeldung und RLS geschützt. Er ist **nicht** Ende-zu-Ende-verschlüsselt: Der Betreiber kann ihn technisch lesen.
     Der Hinweis in der App sagt das offen.
   - **Ohne Konto (Geräte-Sync):** Ende-zu-Ende-verschlüsselt. Der Schlüssel liegt nur auf den Geräten und wird per
     Code/QR übertragen. Der Betreiber sieht nur Zeichensalat.
3. **Pseudonyme Rangliste.** Nur ein selbst gewählter Benutzername, nur mit Einwilligung, jederzeit löschbar.
4. **Kein Tracking**, keine Analyse, keine Drittanbieter-Ressourcen (Schriften, Skripte liegen lokal).
5. **Löschen per Knopf** für alles (lokal, Konto, Sicherung, Rangliste).

## Verarbeitungsübersicht (Art. 30 DSGVO, vereinfacht)

| Verarbeitung | Daten | Wo | Rechtsgrundlage | Wer kann lesen | Löschung |
| --- | --- | --- | --- | --- | --- |
| Auslieferung der App | IP, Zeit, Datei, User-Agent | Cloudflare (AV) | Art. 6 (1) f | Cloudflare (Logs) | Fristen des Anbieters |
| Lernstand lokal | Antworten, Markierungen, Ergebnisse, Belohnungen | Browser (localStorage) | § 25 (2) Nr. 2 TDDDG, Art. 6 (1) b | nur Nutzer | Einstellungen → zurücksetzen |
| Konto (optional) | GitHub-ID, -Name, E-Mail, Avatar-URL | Supabase Auth, Frankfurt (AV) | Art. 6 (1) b | Betreiber im Dashboard (unvermeidbar) | Konto löschen |
| Stand im Konto (optional) | Lernstand + Belohnungen (JSON), Version, Zeitstempel (`app_sync`) | Supabase DB, Frankfurt | Art. 6 (1) b | Nutzer über die App; Betreiber technisch (nicht E2E) | „Kopie im Konto löschen“ / Konto löschen; Tagesstände max. 10 Tage |
| Geräte-Sync ohne Konto (optional) | **verschlüsselter** Lernstand + Belohnungen unter Prüfsumme (`tap2_sync`) | Supabase DB, Frankfurt | Art. 6 (1) b | niemand außer Nutzer (Schlüssel nur im Browser) | „Kopie in der Cloud löschen“ |
| Rangliste (optional) | Benutzername, Level, XP, Figur, Einwilligungszeitpunkt | Supabase DB, Frankfurt | Art. 6 (1) a | alle Nutzer (nur diese Felder) | Austragen / Konto löschen |
| Patch Notes (Seite öffnen) | IP an GitHub | GitHub (USA, DPF) | Art. 6 (1) f | GitHub | – |
| Übertragen per Link/QR | Lernstand im #-Teil des Links | nur auf den Geräten (kein Server) | Art. 6 (1) b | wer den Link hat | Link nicht weitergeben |
| Fehler melden | was der Nutzer selbst auf GitHub abschickt | GitHub (USA, DPF) | eigenständig GitHub | öffentlich | über GitHub |
| KI-Tutor (nur Admin) | Eingaben des Admins, Übergabe (Stand je Konzept, Fehlvorstellungen – keine Namen) | Anthropic (USA) | – (nur eigene Daten des Betreibers) | Anthropic | nach Anbieter |
| Tutor-Stand (nur Admin) | Belege, Fehlvorstellungen, Sitzungen, Tutor-XP (JSON), Version, Zeitstempel (`app_tutor_state`) | Supabase DB, Frankfurt | – (nur eigene Daten des Betreibers); später Art. 6 (1) b | Nutzer über die App; Betreiber technisch (nicht E2E) | Konto löschen (Kaskade) |

AV = Auftragsverarbeitung. **Supabase:** Der DPA ist Teil der Terms of Service und gilt automatisch für alle
Organisationen (geprüft am 13.11.2026 unter Organization → Settings → Legal Documents, „View DPA“). Eine Kopie als
PDF für die eigenen Unterlagen ablegen (Rechenschaftspflicht, Art. 5 Abs. 2 DSGVO) – nicht im Repo.
**Cloudflare:** DPA ist ebenfalls Teil der Cloudflare-Bedingungen.

## Technische Umsetzung

### Konto (GitHub über Supabase Auth)
- Nur der Provider GitHub, E-Mail-Registrierung im Dashboard **aus**, anonyme Anmeldung **aus**.
- Die App nutzt ausschließlich `auth.uid()`. GitHub-Name und E-Mail werden nirgends in eigene Tabellen kopiert.
- Anmelde-Token im localStorage (technisch notwendig, kein Einwilligungsbanner nötig).

### Stand im Konto (mit Konto)
- Tabelle `app_sync (user_id PK = auth.uid(), rev, data jsonb, updated_at)` und `app_sync_history` (ein Stand pro Tag,
  10 Tage), `supabase/001_app_sync.sql`.
  - RLS an, keine Tabellenrechte für `anon`/`authenticated`, zusätzlich eine Richtlinie „nur eigene Zeile“.
  - Zugriff nur über `app_sync_pull/push/delete` (security definer, `auth.uid()`, Versionsprüfung, Größe ≤ 600 kB).
- `data` = `{ v, s: Lernstand (v7), g: Belohnungen (Sync-Paket), at }`. Die App prüft alles, was sie liest
  (`normalize`, `gm.merge`).
- Zusammenführen wie beim Geräte-Sync: pro Frage gilt der neuere Stand, Belohnungen werden gespiegelt, nichts geht
  verloren.
- **Nicht Ende-zu-Ende-verschlüsselt** (bewusst, damit der Login reicht). Wer das nicht möchte, nutzt den Geräte-Sync
  ohne Konto.
- Stände ohne Konto lassen sich per Kurzcode oder Schlüssel einmalig ins Konto übernehmen. Die App entschlüsselt sie
  dafür im Browser und speichert sie danach im Konto.

### Geräte-Sync ohne Konto
- Wie in der Live-App (`tap2_sync`): Der Lernstand wird im Browser mit AES-GCM verschlüsselt. Der Schlüssel (160 Bit
  Zufall) geht nie zum Server und wird per Kurzcode/QR übertragen (PBKDF2-geschützt). Der Server kennt nur eine
  Prüfsumme als ID.

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
- Anweisungen und Werkzeug legt nur der Server fest; an Anthropic gehen die Wissensbasis (Katalog), die Übergabe zum
  Thema (Stand je Konzept, Fehlvorstellungen, häufige Fehler – keine Namen, keine Konto-Daten) und der Gesprächsverlauf.
- **Tutor-Stand** (`supabase/004_app_tutor_state_konto.sql`, ersetzt 003): Tabelle `app_tutor_state (user_id PK =
  auth.uid(), rev, data jsonb, updated_at)`.
  - RLS an, keine Tabellenrechte, Richtlinie „nur eigene Zeile“.
  - Zugriff nur über `app_tutor_state_pull/push/delete`.
  - Wie der Stand im Konto **nicht** Ende-zu-Ende-verschlüsselt; der Login reicht.
  - Löschen beim Konto-Löschen per Kaskade; „Tutor-Wissen zurücksetzen“ in der App leert ihn auf allen Geräten.
- Der Gesprächsverlauf bleibt nur im Browser (`tap2coach-tutor-sitzung`).
- Vor einer späteren Bezahl-Option nötig: Einwilligung/Information zur Übermittlung an Anthropic (USA),
  DPA mit Anthropic, Impressum, AGB, Zahlungsanbieter.

## Offene Punkte vor der Veröffentlichung

- [x] Verantwortlicher und Kontakt (über GitHub) in `src/config.ts` (`CONTROLLER`) eingetragen.
- [x] DPA Supabase: automatisch über die Terms of Service; Kopie als PDF privat ablegen.
- [ ] Optional: eigene Kontakt-E-Mail nur für die App (GitHub hat keine privaten Nachrichten).
- [ ] Supabase: E-Mail-Provider und anonyme Anmeldung aus, nur GitHub an.
- [x] Impressum: entfällt, solange die App kostenlos ist (§ 5 DDG gilt für geschäftsmäßige, meist entgeltliche
      Dienste). Mit einer Premium-/Bezahl-Option Pflicht.
- [x] Live-App (`main`): Datenschutzhinweis als Seite ergänzt (v2.7.5).
