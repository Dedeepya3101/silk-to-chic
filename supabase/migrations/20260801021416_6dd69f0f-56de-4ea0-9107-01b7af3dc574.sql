-- 1. admin role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. admin check helper (text compare avoids new-enum-value-in-same-tx issues)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'admin'
  )
$$;

-- 3. reports moderation fields
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- 4. account suspension
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- 5. block history preservation
ALTER TABLE public.blocks
  ADD COLUMN IF NOT EXISTS unblocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS unblocked_by uuid;

-- 6. platform settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'MatchO',
  contact_email text NOT NULL DEFAULT 'support@matcho.app',
  safety_notice text NOT NULL DEFAULT 'Keep conversations inside MatchO. Never share phone numbers, addresses, OTPs or make payments outside the platform.',
  report_categories text[] NOT NULL DEFAULT ARRAY['Spam','Abuse','Fake profile','Fraud','Other'],
  require_identity_verification boolean NOT NULL DEFAULT false,
  require_portfolio_verification boolean NOT NULL DEFAULT false,
  auto_verify_tailors boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_settings TO authenticated;
GRANT UPDATE, INSERT ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone signed in can read settings"
  ON public.admin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage settings insert"
  ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins manage settings update"
  ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER admin_settings_touch
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.admin_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings);

-- 7. admin read/write policies on existing tables
CREATE POLICY "admins read all roles"
  ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "admins update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins read all reports"
  ON public.reports FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admins update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins read all blocks"
  ON public.blocks FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admins update blocks"
  ON public.blocks FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins read all uploads"
  ON public.saree_uploads FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admins read all suggestions"
  ON public.suggestions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admins read all completions"
  ON public.completed_projects FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admins read all messages meta"
  ON public.messages FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admins read all notifications"
  ON public.notifications FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "admins update tailor verification"
  ON public.tailor_profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
