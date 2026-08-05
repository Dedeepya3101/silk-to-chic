-- 1. profiles: suspension detail columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

-- 2. tailor_profiles: verification workflow columns
ALTER TABLE public.tailor_profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS verification_documents text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

UPDATE public.tailor_profiles
SET verification_status = 'approved', verified_at = COALESCE(verified_at, now())
WHERE verified_tailor = true AND verification_status = 'pending';

-- 3. suspensions history
CREATE TABLE IF NOT EXISTS public.suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid,
  reason text NOT NULL,
  details text,
  duration text NOT NULL DEFAULT 'permanent',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.suspensions TO authenticated;
GRANT ALL ON public.suspensions TO service_role;
ALTER TABLE public.suspensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage suspensions" ON public.suspensions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read own suspensions" ON public.suspensions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. moderation actions (warnings, escalations, review notes)
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  target_user_id uuid NOT NULL,
  admin_id uuid,
  action text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage moderation actions" ON public.moderation_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read own moderation actions" ON public.moderation_actions FOR SELECT TO authenticated
  USING (auth.uid() = target_user_id);

-- 5. appeals
CREATE TABLE IF NOT EXISTS public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  suspension_id uuid REFERENCES public.suspensions(id) ON DELETE SET NULL,
  message text NOT NULL,
  explanation text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.appeals TO authenticated;
GRANT ALL ON public.appeals TO service_role;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage appeals" ON public.appeals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read own appeals" ON public.appeals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Members submit own appeals" ON public.appeals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER appeals_touch BEFORE UPDATE ON public.appeals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. suspension helper + marketplace lockdown
CREATE OR REPLACE FUNCTION public.is_suspended(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _uid AND p.suspended = true
      AND (p.suspended_until IS NULL OR p.suspended_until > now())
  )
$$;

CREATE POLICY "Suspended members cannot upload" ON public.saree_uploads AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public.is_suspended(auth.uid()));
CREATE POLICY "Suspended members cannot message" ON public.messages AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public.is_suspended(auth.uid()));
CREATE POLICY "Suspended members cannot reply" ON public.suggestion_replies AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public.is_suspended(auth.uid()));
CREATE POLICY "Suspended members cannot suggest" ON public.suggestions AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public.is_suspended(auth.uid()));
CREATE POLICY "Suspended members cannot review" ON public.reviews AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public.is_suspended(auth.uid()));
CREATE POLICY "Suspended members cannot request" ON public.tailor_requests AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public.is_suspended(auth.uid()));

-- 7. new tailors start pending verification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  _role app_role;
begin
  _role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'user');
  insert into public.profiles (id, display_name, email, city, specialization)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'specialization'
  );
  insert into public.user_roles (user_id, role) values (new.id, _role);
  if _role = 'tailor' then
    insert into public.tailor_profiles (tailor_id, verification_status)
    values (new.id, 'pending');
  end if;
  return new;
end;
$$;

-- backfill: every existing tailor has a queue row
INSERT INTO public.tailor_profiles (tailor_id, verification_status)
SELECT ur.user_id, 'pending'
FROM public.user_roles ur
WHERE ur.role = 'tailor'
  AND NOT EXISTS (SELECT 1 FROM public.tailor_profiles tp WHERE tp.tailor_id = ur.user_id);