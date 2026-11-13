-- Sicherheits-Härtung (Security-Check 13.11.2026). Nach 0000–0002 ausführen.
-- Jede Anweisung ist idempotent, die Datei darf mehrfach laufen.

-- 1) Nicht angemeldete Besucher (Rolle anon) bekommen keinerlei Tabellenrechte.
--    Supabase vergibt im Schema public standardmäßig Rechte an anon; RLS blockt zwar,
--    aber ohne Grant gibt es gar keine Angriffsfläche.
REVOKE ALL ON public.learning_sessions, public.session_messages, public.propositions,
              public.proposition_links, public.item_progress, public.learning_sources FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- 2) Speicher für Anhänge: immer privat, nur erlaubte Dateitypen, max. 10 MB.
--    Kein SVG/HTML (könnten Skripte enthalten). Zugriff nur über signierte URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', false, 10485760,
        ARRAY['image/png','image/jpeg','image/gif','image/webp','application/pdf',
              'text/plain','text/markdown','text/csv','application/json'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
                               allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Verknüpfungen nur zwischen eigenen Datensätzen (sonst ließe sich per Fremdschlüssel
--    testen, ob eine fremde ID existiert).
DROP POLICY IF EXISTS "own links insert" ON public.proposition_links;
CREATE POLICY "own links insert" ON public.proposition_links FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.propositions p WHERE p.id = premise_id AND p.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.propositions p WHERE p.id = conclusion_id AND p.user_id = auth.uid())
);
DROP POLICY IF EXISTS "own props insert" ON public.propositions;
CREATE POLICY "own props insert" ON public.propositions FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND (source_session_id IS NULL OR EXISTS (SELECT 1 FROM public.learning_sessions s WHERE s.id = source_session_id AND s.user_id = auth.uid()))
);
DROP POLICY IF EXISTS "own props update" ON public.propositions;
CREATE POLICY "own props update" ON public.propositions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id
  AND (source_session_id IS NULL OR EXISTS (SELECT 1 FROM public.learning_sessions s WHERE s.id = source_session_id AND s.user_id = auth.uid()))
);

-- 4) Größenlimits gegen Speicher-Missbrauch (jedes GitHub-Konto kann sich anmelden).
--    NOT VALID: bestehende Zeilen werden nicht geprüft, neue schon.
DO $$ BEGIN
  ALTER TABLE public.learning_sessions ADD CONSTRAINT ls_len CHECK (length(title) <= 300 AND length(goal) <= 1000 AND length(learner_model) <= 20000 AND pg_column_size(plan) <= 100000) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.session_messages ADD CONSTRAINT sm_len CHECK (length(content) <= 40000 AND coalesce(length(thinking), 0) <= 10000 AND coalesce(length(demo_html), 0) <= 200000 AND pg_column_size(attachments) <= 20000 AND pg_column_size(images) <= 20000 AND pg_column_size(sources) <= 20000) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.propositions ADD CONSTRAINT pr_len CHECK (length(statement) <= 2000 AND length(topic) <= 200) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.item_progress ADD CONSTRAINT ip_len CHECK (length(item_id) <= 100 AND length(topic) <= 100) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
