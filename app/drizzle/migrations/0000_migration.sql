CREATE TABLE public.learning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'teach' CHECK (kind IN ('teach','practice')),
  title text NOT NULL DEFAULT 'Untitled',
  goal text NOT NULL,
  phase text NOT NULL DEFAULT 'measure' CHECK (phase IN ('measure','plan','teach','practice','done')),
  plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_step integer NOT NULL DEFAULT 0,
  learner_model text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_sessions TO authenticated;
GRANT ALL ON public.learning_sessions TO service_role;
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions select" ON public.learning_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sessions insert" ON public.learning_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sessions update" ON public.learning_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sessions delete" ON public.learning_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL DEFAULT '',
  thinking text,
  confidence integer,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  demo_html text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.session_messages (session_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_messages TO authenticated;
GRANT ALL ON public.session_messages TO service_role;
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages select" ON public.session_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own messages insert" ON public.session_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.learning_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "own messages delete" ON public.session_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.propositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  statement text NOT NULL,
  topic text NOT NULL DEFAULT '',
  source_session_id uuid REFERENCES public.learning_sessions(id) ON DELETE SET NULL,
  source_kind text NOT NULL DEFAULT 'session' CHECK (source_kind IN ('session','notes')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.propositions TO authenticated;
GRANT ALL ON public.propositions TO service_role;
ALTER TABLE public.propositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own props select" ON public.propositions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own props insert" ON public.propositions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own props update" ON public.propositions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own props delete" ON public.propositions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.proposition_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  premise_id uuid NOT NULL REFERENCES public.propositions(id) ON DELETE CASCADE,
  conclusion_id uuid NOT NULL REFERENCES public.propositions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (premise_id, conclusion_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposition_links TO authenticated;
GRANT ALL ON public.proposition_links TO service_role;
ALTER TABLE public.proposition_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own links select" ON public.proposition_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own links insert" ON public.proposition_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own links delete" ON public.proposition_links FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own attachments read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own attachments delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);