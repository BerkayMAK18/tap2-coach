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

**Voraussetzungen von dir:** Supabase-Dev-Projekt, GitHub-OAuth-App, Claude-API-Key, Admin-Rolle für dein Konto
(einmalig per SQL: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where id = '<deine-id>';`).
