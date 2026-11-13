CREATE TABLE public.item_progress (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  item_id text NOT NULL,
  topic text NOT NULL,
  box int NOT NULL DEFAULT 0,
  due date NOT NULL DEFAULT current_date,
  correct int NOT NULL DEFAULT 0,
  wrong int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_progress TO authenticated;
GRANT ALL ON public.item_progress TO service_role;
ALTER TABLE public.item_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON public.item_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);