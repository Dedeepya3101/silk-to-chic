CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  suggestion_id uuid,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reporter can insert own report" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reporter can view own reports" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());

CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocker can insert" ON public.blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "blocker can delete" ON public.blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "participants can view blocks" ON public.blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

ALTER TABLE public.tailor_profiles
  ADD COLUMN IF NOT EXISTS verified_tailor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portfolio_verified boolean NOT NULL DEFAULT false;