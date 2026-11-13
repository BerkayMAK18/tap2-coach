CREATE TABLE public.learning_sources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200), topic_id text, content text NOT NULL DEFAULT '' CHECK (length(content) <= 40000), file_path text, file_name text, file_type text, created_at timestamptz NOT NULL DEFAULT now(), CHECK (length(content) > 0 OR file_path IS NOT NULL), CHECK (file_path IS NULL OR split_part(file_path, '/', 1) = user_id::text));
GRANT SELECT, INSERT, DELETE ON public.learning_sources TO authenticated;
GRANT ALL ON public.learning_sources TO service_role;
ALTER TABLE public.learning_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own learning sources" ON public.learning_sources FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX learning_sources_owner ON public.learning_sources(user_id, created_at DESC);