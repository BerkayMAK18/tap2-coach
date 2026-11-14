# Premium: KI-Prüfungstutor für die TAP2

Stand: 14.11.2026. Premium-Funktion der neuen App, vorerst nur für den Admin, später für alle (mit XP, Serie, Tageszielen).

**Eingerichtet (14.11.2026):** `003_app_tutor_state.sql` ist eingespielt, die Edge Function ist deployt.

## Was er tut

Der Tutor ist auf die **TAP2 (FIAE)** spezialisiert und arbeitet ausschließlich mit den Themen und Lernpaketen des
Katalogs. Eine **Sitzung gilt einem Thema**: Du wählst es selbst, oder der **Lehrplan** empfiehlt eins. Danach stellt
dir der Tutor die ganze Sitzung lang Aufgaben im IHK-Stil und **bewertet wie ein IHK-Prüfer**:

- Er legt je Aufgabe einen **Erwartungshorizont** fest (Aspekte mit Punkten). Die Bewertung zeigt die Teilpunkte mit
  Begründung, z. B. „2 von 4 P.: … es fehlt …“. Den Erwartungshorizont siehst du erst nach der Bewertung.
- Er beachtet die **Operatoren** (Nennen … Beurteilen, Anforderungsbereich I–III). Wird der Operator nicht erfüllt,
  gibt es Abzug.
- Er verrät die Lösung nicht vorschnell. **„Ich stehe auf dem Schlauch“** liefert einen kleineren Teilschritt oder
  ein Gerüst, nicht die Lösung.
- Zu jeder Antwort gibt es zwei **optionale Felder**:
  - **Gedankengang:** warum du so geantwortet hast. Das ist eine Hilfe für den Tutor, keine Antwort.
  - **Sicherheit:** geraten · unsicher · ziemlich sicher · sicher.

  Ist eine Antwort **sicher, aber falsch** (mindestens „ziemlich sicher“ und weniger als die Hälfte der Punkte), wird
  daraus eine **Fehlvorstellung**. Das passiert im Code, auch wenn der Tutor selbst keine meldet.

## Aufbau

- **`/tutor` → Tab „Sitzung“.** Ohne laufende Sitzung siehst du die Themenwahl: alle Katalogthemen nach Prüfungsteil
  mit Stand, Muss-Kennzeichen und offenen Fehlvorstellungen; die Empfehlung aus dem Lehrplan steht oben. Mit Sitzung
  gibt es zwei Spalten:
  - **Links der Chat** mit dem Eingabefeld „Deine Antwort oder Frage“, „Senden“, den Feldern *Gedankengang* und
    *Sicherheit* und dem Knopf „Ich stehe auf dem Schlauch“. Aufgaben und Bewertungen erscheinen als Karten.
  - **Rechts die Reiter:**
    - **Aufgabe:** Aufgabenstellung, Operator mit Anforderungsbereich, Punkte und das Ausgangsmaterial (Tabelle,
      Code, Geschäftsregeln, Text). Die App rendert das Material selbst und übernimmt nie HTML aus der KI. Nach der
      Bewertung folgen Teilpunkte und Erwartungshorizont.
    - **Dein Stand:** Graph des Themas: Lernpakete → Konzepte, Fehlvorstellungen als eigene Knoten.

  Auf dem Handy wechseln Chat, Aufgabe und Stand über Reiter.
- **`/tutor` → Tab „Lehrplan“:** Plan bis zur Prüfung (siehe unten). „Starten“ beginnt eine Sitzung zu Thema und Fokus
  des Eintrags.
- Design ausschließlich wie in `main` (`theme/main.css`, `ui-main`, Ergänzungen in `theme/app.css` mit Präfix `tp-`).

## Technik

| Teil | Datei | Kern |
| --- | --- | --- |
| Edge Function | `supabase/functions/tutor/index.ts` | Anweisungen und **ein Werkzeug `pruefer_runde` mit festem Schema** nur auf dem Server; Anfragen mit `system`/`tools` werden abgelehnt |
| Schema (Zod) | `src/lib/tutor-schema.ts` | Jede Runde ist Fremdtext: Längen, nur bekannte Themen-/Konzept-IDs, Material nur als Daten, abschnittsweise geprüft |
| Sitzung | `src/lib/tutor-session.ts` | Übergabe, Nachrichten, Runden → Aufgaben/Bewertungen/Belege, Feed, Kosten |
| Tutor-Stand | `src/lib/tutor-state.ts` | Belege, Fehlvorstellungen, Sitzungen, Tutor-XP je Tag; **Merge-Regel** |
| Abgleich | `src/lib/tutor-sync.ts`, `supabase/003_app_tutor_state.sql` | E2E-verschlüsselt in `app_tutor_state` |
| Graph | `src/lib/graph.ts` (`buildConceptGraph`) | Konzepte = Kernaussagen (`P04.2` …), Stand aus Belegen + Fragendaten |
| Lehrplan | `src/lib/lehrplan.ts` | deterministisch, nicht von der KI |
| XP | `store/tutor.ts` → `gm.answer` mit `rewardArgs` | wie eine normale Antwort (Combo, Serie, Quests), keine Obergrenze |
| Store/UI | `src/store/tutor.ts`, `src/routes/tutor.tsx`, `src/components/TutorChat.tsx`, `src/components/tutor/*` | |

### Eine Runde

1. Die App schickt `{ model, wissen, messages }`:
   - `wissen` = Überblick der Wissensbasis (Themen → Lernpakete → Kernaussagen).
   - Die erste Nachricht ist die Übergabe: Thema, Stand je Konzept, offene Fehlvorstellungen mit `fehl_id`, häufige
     Fehler und die vollen Inhalte der Lernpakete des Themas, in Blöcken ≤ 7500 Zeichen.
2. Der Server hängt Anweisungen und das Werkzeug an. Er nutzt `tool_choice: auto` und `disable_parallel_tool_use`,
   weil Sonnet 5.5 kein erzwungenes `tool_choice` erlaubt. Mit `strict: true` liefert Claude gültige Felder.
3. Claude ruft pro Runde einmal `pruefer_runde` auf und liefert darin:
   - `nachricht`: Chat-Text,
   - `phase`,
   - ggf. `aufgabe`: Operator, Punkte, Stellung, Konzepte, Material, Erwartungshorizont,
   - `bewertung`: Teilpunkte, „es fehlt“, Operator erfüllt,
   - `graph`: Beleg/Lücke/Fehlvorstellung/behoben je Konzept, mit Mastery-Änderung,
   - `abschluss`.
4. Die App prüft alles mit Zod und stellt es selbst dar. Ungültige Teile gehen als Hinweis im `tool_result` mit der
   nächsten Nachricht zurück. Der Verlauf wird nur angehängt; Denk-Blöcke bleiben unverändert.
5. **Gleichlauf:** `tutor-tool.test.ts` liest das JSON-Schema aus der Edge Function und vergleicht es mit dem
   Zod-Schema. Es prüft auch die Regeln für strenge Werkzeuge: geschlossene Objekte, keine Längen- oder Zahlengrenzen
   im Schema.

### Graph eine Ebene tiefer

- **Konzepte** sind die Kernaussagen der Lernpakete eines Themas (`kern` im Katalog), z. B. funktionale Abhängigkeit
  oder 2NF.
- **Beherrschung** ist ein gewichteter Mittelwert:
  - Vorwissen aus den Lernrunden: Karten der Paket-Decks, sonst das Thema; Gewicht bis 2.
  - Tutor-Belege: Bewertung = Anteil der Punkte; Beleg 0,6–1; Lücke 0–0,4; Fehlvorstellung 0,1; behoben 0,75.
  - Neuere Belege zählen mehr: Faktor 0,8 je älterem Beleg.
- **Einordnung:**
  - Eine offene Fehlvorstellung macht das Konzept „schwach“.
  - „Sitzt“ erst ab 75 % und mindestens zwei Tutor-Belegen.
- **Fehlvorstellungen** sind eigene Knoten. Sie bleiben offen, solange sie nach dem letzten „behoben“ noch einmal
  auftraten.

### Lehrplan (deterministisch)

**Bedarf je Thema** (Summe):
- (1 − Stand) × Gewicht: Muss 1,5, sonst 1,0,
- plus 0,2 je offener Fehlvorstellung (höchstens 0,6),
- plus 0,15, wenn das Thema seit 3 Tagen nicht geübt wurde.

**Verteilung:**
- Es zählen die Tage bis zum Vortag von `EXAM_DAY`, mit 2 Sitzungen je Tag.
- Das Thema mit dem höchsten Bedarf kommt zuerst; danach sinkt sein Bedarf (× 0,55), über Nacht erholt er sich etwas.
- Ab 3 Tagen vor der Prüfung kommen nur noch Muss-Themen und Themen mit offener Fehlvorstellung dran.
- Der Vortag ist für Wiederholung reserviert.
- Fokus je Sitzung sind die drei schwächsten Konzepte.

Weil der Plan aus dem synchronisierten Tutor-Stand berechnet wird, passt er sich nach jeder Sitzung an und ist auf
allen Geräten gleich.

### Tutor-Stand auf allen Geräten

- **Gespeichert:** Belege, Fehlvorstellungen, Sitzungen und Tutor-XP je Tag – lokal (`tap2coach-tutor-stand`) und in
  `app_tutor_state` (eine Zeile pro Konto, RLS nur eigene Zeile, Zugriff nur über `app_tutor_state_*`).
- **Verschlüsselung:** `seal`/`unseal` mit dem vorhandenen Sync-Schlüssel. Das ist der Geräte-Sync `tap2_sync`, sonst
  der Konto-Sync. Der Server sieht nur `1.<iv>.<ciphertext>` und eine Prüfsumme des Schlüssels (`kid`). Liegt in der
  Cloud ein Stand mit anderem Schlüssel, wird er nicht überschrieben; ersetzen geht nur auf ausdrücklichen Wunsch.
- **Bewusst nicht im Paket `tap2_sync`:** `main` schreibt dieses Paket neu und würde fremde Teile verwerfen.
- **Nur auf dem Gerät:** der Gesprächsverlauf (Denk-Blöcke gelten nur in ihrem Verlauf).
- **Merge-Regel** (`mergeTutor`, kommutativ, assoziativ, idempotent; getestet):

  | Teil | Regel |
  | --- | --- |
  | Belege | Vereinigung über die ID, sortiert nach Zeit, die jüngsten 800 bleiben |
  | Fehlvorstellungen | Vereinigung; Text vom zuletzt gesehenen Eintrag; first = frühester, seen = spätester, fix = spätester Zeitpunkt; Anzahl aus den Belegen abgeleitet |
  | Sitzungen | Vereinigung; Zähler je Sitzung als Maximum |
  | Tutor-XP | je Tag und Gerät das Maximum; Summe über Geräte = XP des Tages |

- Der alte Lernpfad (`tap2coach-tutor-pfad`, nur dieses Gerät) und Fehlvorstellungen aus der Claude-Brücke werden
  einmalig übernommen. Die IDs sind fest, sodass zwei Geräte zum selben Ergebnis kommen.

### XP, Serie, Tagesziele

Eine bewertete Aufgabe zählt **genau wie eine normale Antwort** in der Lernrunde. Sie läuft über denselben Aufruf des
Belohnungs-Moduls (`gm.answer` → `onAnswer`, Argumente aus `rewardArgs` in `lib/tutor-session.ts`). Es gibt **keine
Tagesobergrenze**.

- Es zählt nur die **erste Bewertung** einer Aufgabe; eine Nachbewertung bringt keine XP mehr.
- „Richtig“ heißt: mindestens die Hälfte der Punkte. „Unsicher“ heißt: als geraten oder unsicher markiert.
- **Richtig und sicher:** 10 XP × Combo-Bonus (× 2 mit Trank), +5 Federn, Antwort-Serie (`combo`) läuft weiter.
- **Unsicher richtig oder falsch:** keine XP, die Serie endet (das Serien-Schild rettet sie) – wie in der Lernrunde.
- Die Aufgabe zählt außerdem für Tagesquests (`G.today.answered/correct/t2/sowi/fresh`) und für die Tagesstatistik
  (`S.log`), also auch für die Lern-Serie.
- Der Tutor-Stand zählt Tutor-XP je Tag und Gerät, aber nur für die Anzeige „Tutor-XP heute“.
- **Gleicher Weg wie alle XP:** `onAnswer` → `addXP` → `G.earned/xp/level`. Die XP stehen damit im Sync-Paket (`x/l/p`)
  und in der Rangliste (`tap2_lb_push` mit `earned`). Das Belohnungs-Modul selbst ist unverändert (1:1 wie `main`).
- **Prüfung gegen `main`** (`lib/gami/tutor-xp.test.ts`, gegen `golden/original.js` = Abschnitt aus `index.html` auf
  `origin/main`, v2.8):
  - Dieselbe Folge von Tutor-Aufgaben ergibt in Dev-App und Original exakt denselben Belohnungs-Stand.
  - `main` übernimmt die Tutor-XP beim Abgleich (`merge` → `mirror`).
  - `main` meldet danach genau diese XP an `tap2_lb_push`.
  - Das Paket hat dieselben Felder wie das von `main`.
- **Bremse der Rangliste** (Server, unverändert): höchstens 30 000 XP Zuwachs pro Tag und Eintrag. Das entspricht weit
  über 1 000 richtigen Antworten.
- **Bekannte Grenze (Regel von `main`, nicht neu):** Verdienen zwei Geräte gleichzeitig XP vom selben Ausgangsstand,
  gilt nach dem Abgleich der weiter fortgeschrittene Stand; die XP werden nicht addiert.

### Modell und Kosten

- **Sonnet 5.5** (`claude-sonnet-5-5`) ist Standard mit Effort `medium` und serverseitiger Ausweichlösung bei
  Ablehnungen. **Haiku 5.5** (`claude-haiku-5-5`, Effort `low`) ist wählbar. Das Modell gilt für eine ganze Sitzung.
- **Prompt-Caching mit 1 Stunde**, weil zwischen Antworten oft mehrere Minuten liegen:
  - fester Marker am System-Teil (Werkzeug + Anweisungen + Wissensbasis),
  - automatisches Caching für den wachsenden Verlauf.
- Kostenanzeige im Kopf der Sitzung, geschätzt aus `usage`.
- Admin-Sperre (`app_metadata.role = 'admin'`) und Tageslimit (`app_tutor_take`, 120 Anfragen) bleiben.

**Grobe Kosten je Sitzung** (8 Aufgaben ≈ 17 Runden; Preise Nov. 2026):
- Annahmen: System-Teil ≈ 10 000 Token, Übergabe ≈ 3 000 Token, je Runde ≈ 300 Token Eingabe und
  ≈ 1 200 Token Ausgabe (inkl. Denken).
- Sonnet 5.5: Eingabe 2 $ und Ausgabe 10 $ je Mio. Token; Cache lesen 0,10 $, Cache schreiben (1 Std.) 4 $.
- Erste Runde ≈ 0,07 $ (Cache schreiben); danach je Runde ≈ 0,003 $ Cache lesen + ≈ 0,006 $ neues Stück + ≈ 0,012 $
  Ausgabe ≈ 0,02 $.

| Modell | je Sitzung | 30 Sitzungen |
| --- | --- | --- |
| Sonnet 5.5 | ≈ 0,40 $ (0,30–0,60 $ je nach Antwortlänge) | ≈ 12 $ |
| Haiku 5.5 | ≈ 0,02–0,04 $ | ≈ 1 $ |

Längere Pausen (> 1 Std.) schreiben den Cache neu: + ≈ 0,05 $.

## Einrichtung (erledigt am 14.11.2026; bei Änderungen an Function oder SQL erneut)

1. **SQL einspielen:** `supabase/003_app_tutor_state.sql` im Supabase-Dashboard → SQL Editor ausführen. Es legt nur
   `app_tutor_state` und die `app_tutor_state_*`-Funktionen an; `tap2_*` bleibt unberührt.
2. **Edge Function deployen:** Code aus `supabase/functions/tutor/index.ts` im Dashboard unter Edge Functions →
   „tutor“ einsetzen und deployen, oder per CLI:

   ```bash
   supabase functions deploy tutor
   ```

   Ohne neues Deploy meldet die App „ältere Tutor-Funktion“.
3. Admin-Rolle (falls noch nicht gesetzt):
   `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where id = '<deine-id>';`

## Ungeprüft / offen

- Kein echter Lauf gegen Supabase und die Claude API in dieser Umgebung:
  - Die Tests decken Schema, Merge, Sync (Schein-Server mit den SQL-Regeln, echte Verschlüsselung), Graph, Lehrplan
    und XP gegen `main` ab.
  - Ob die API das strenge Schema annimmt (z. B. `anyOf` im Material), zeigt erst der erste echte Aufruf. Bei Fehler
    400 im Schema `strict` entfernen; die App prüft ohnehin mit Zod.
- Für „für alle“ später: Einwilligung/Information zur Übermittlung an Anthropic (USA), DPA, Tageslimits je Konto
  überdenken, `FEATURES.tutor` und Datenschutzhinweis.
