CREATE TABLE IF NOT EXISTS public.ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.ai_events TO authenticated;
GRANT ALL ON public.ai_events TO service_role;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_events_own_select" ON public.ai_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_events_own_insert" ON public.ai_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_events_admin_select" ON public.ai_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS ai_events_user_created_idx ON public.ai_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_tool_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent text not null,
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  ok boolean not null default true,
  error text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.ai_tool_runs TO authenticated;
GRANT ALL ON public.ai_tool_runs TO service_role;
ALTER TABLE public.ai_tool_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_tool_runs_own_select" ON public.ai_tool_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_tool_runs_own_insert" ON public.ai_tool_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS ai_tool_runs_user_created_idx ON public.ai_tool_runs (user_id, created_at DESC);