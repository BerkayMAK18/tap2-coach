# Premium: KI-Tutor mit Wissensgraph (nach dem LearnHarness-Prinzip)

Stand: 13.11.2026. Premium-Funktion der neuen App, vorerst nur für den Admin.

## Stufe 1 – Wissensgraph ohne KI (fertig)

- `src/lib/graph.ts` (+ Test): Graph aus der Knowledge Base der App (Prüfungsteile → Themen → Lernpakete) mit
  Beherrschung aus dem Lernstand. Einordnung je Thema: **stark / festigen / schwach / offen**, dazu
  **Fehlerschwerpunkte** (häufig falsch beantwortete, noch nicht grüne Fragen).
- `src/routes/tutor.tsx`: Seite `/tutor` mit Graph, Schwächen, Stärken, offenen Themen und Fehlerschwerpunkten;
  „Üben“ startet direkt eine passende Lernrunde. Kein Menüeintrag.
- Freischalten auf einem Gerät: `/tutor?premium=1` (setzt `tap2coach-premium`). Das schützt nichts Geheimes,
  die Seite zeigt nur den eigenen lokalen Lernstand. Die echte Prüfung kommt mit Stufe 2 serverseitig.

## Tutor-Lernpfad (14.11.2026)

Ablauf nach dem LearnHarness-Prinzip (eigene Umsetzung, kein Code übernommen): **Stand finden → Lehrplan → Lernen.**

- **Wissensbasis** (`src/lib/tutor-kb.ts`): ausschließlich der Katalog der App – Prüfungsteil → Thema (T…) →
  Lernpaket (P…) → Kernaussage (P….n), dazu Prüfungsrelevanz, Fallen, Lernziele. Der Tutor bekommt Überblick und
  alle Inhalte im festen System-Teil (Prompt-Caching) und arbeitet nur darauf.
- **Wissensgraph als Lernermodell:** Beim Start geht eine Übergabe an den Tutor – Reife je Thema aus den Lernrunden,
  rot/neu, Pflichtthemen, häufigste Fehler, Tutor-Reife und der bisherige Lernpfad. Jede bewertete Antwort fließt
  zurück (Beleg je Thema → „Tutor-Reife“, violetter Balken im Lernstand).
- **Werkzeuge statt Textblöcke** (`src/lib/tutor-protocol.ts`, mit Tests): `stand_festhalten`, `lehrplan_setzen`,
  `frage_stellen`, `antwort_bewerten`, `schritt_abschliessen`. Eingaben werden mit Zod und den bekannten IDs geprüft;
  Ungültiges geht als Fehler an den Tutor zurück. Immer nur eine offene Frage.
- **Fragen als Karten:** Auswahl (A–D, bewertet die App selbst) oder freie Antwort im IHK-Stil (bewertet der Tutor mit
  Punkten); dazu „laut denken“, Sicherheit (unsicher / eher sicher / sicher) und „Ich weiß es nicht“.
- **Belohnung:** Jede Antwort zählt in die Tagesstatistik (`S.log`, Format v7 unverändert). XP und Quests über das
  Belohnungs-Modul (`gm.answer`, Pseudo-ID `tutor:<Thema>`): richtig = Auswahl richtig bzw. mindestens die Hälfte der
  Punkte; unsicher richtig gibt wie in den Lernrunden keine XP.
- **Speicher (nur dieses Gerät):** Lernpfad `tap2coach-tutor-pfad`, Gespräch `tap2coach-tutor-gespraech`. Das Gespräch
  wird nie gekürzt (Denk-Blöcke der API bleiben unverändert); wird es zu lang, beginnt ein neues mit Übergabe.
- **Ansicht:** links der Chat (Ablauf-Leiste, Blasen, Karten für Fragen, Bewertungen, Lehrplan, geschaffte Schritte),
  rechts die Leiste **Lehrplan** · **Lernstand** · **Frage**; auf dem Handy Reiter.
- **Edge Function** `supabase/functions/tutor/index.ts`: lässt nur diese fünf Werkzeuge zu, nimmt Inhaltsblöcke an
  (Text, Werkzeug-Ergebnisse; vom Tutor Text, Werkzeugaufrufe, Denk-Blöcke) und gibt alle Blöcke zurück.
  **Nach Änderungen im Supabase-Dashboard neu deployen.**

## Stufe 2 – KI-Tutor (geplant)

Ablauf wie LearnHarness: **Diagnose → Plan → Erklären → Transfer → Erkenntnis sichern.**

1. **Lernermodell:** Der Tutor bekommt den Graphen (Stufe 1) als Zusammenfassung: schwache Themen, Fehlerschwerpunkte,
   offene Muss-Themen – keine Rohdaten, keine Namen.
2. **Wissensbasis:** Antworten stützen sich auf den Katalog (Lernpakete, Musterlösungen, Erklärungen). Der Tutor
   zitiert die passende Stelle statt frei zu erfinden.
3. **Belegte Erkenntnisse:** Nur was der Lernende in eigenen Worten richtig erklärt, wird als Erkenntnis in den
   Graphen geschrieben (Knoten „verstanden“ mit Beleg). Fehlvorstellungen werden als eigene Knoten markiert.
4. **Technik:**
   - Supabase Edge Function `tutor` (Deno) ruft die Claude API auf; Schlüssel als Supabase-Secret.
   - Zugriff nur mit Login und `app_metadata.role = 'admin'` im geprüften JWT (Nutzer können das nicht selbst setzen).
   - Antworten als validiertes JSON (Zod): `reply`, `phase`, `plan`, `new_insights[]` mit Beleg, `next_question`.
   - Gesprächsverlauf und Erkenntnisse: Ende-zu-Ende-verschlüsselt im Konto wie der Sync (`docs/DATENSCHUTZ.md`);
     an Anthropic geht nur der jeweils nötige Kontext.
   - Tageslimit pro Konto gegen Kosten.
5. **Datenschutz:** Abschnitt „KI-Tutor“ im Hinweis aktivieren (`FEATURES.tutor`). Für eine spätere Bezahl-Option:
   Einwilligung zur Übermittlung an Anthropic (USA), DPA, Impressum.

**Voraussetzungen von dir:** Live-Supabase-Projekt wird mitbenutzt (Option B, docs/ENTWICKLUNG.md), GitHub-OAuth-App, Claude-API-Key, Admin-Rolle für dein Konto
(einmalig per SQL: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where id = '<deine-id>';`).
