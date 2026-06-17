
-- Extend saree_uploads with lifecycle fields
ALTER TABLE public.saree_uploads
  ADD COLUMN IF NOT EXISTS assigned_tailor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tailor_marked_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_confirmed_completion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Normalize status values; keep as text but constrain
DO $$ BEGIN
  ALTER TABLE public.saree_uploads ADD CONSTRAINT saree_uploads_status_chk
    CHECK (status IN ('open','in_progress','completed'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_saree_uploads_status ON public.saree_uploads(status);
CREATE INDEX IF NOT EXISTS idx_saree_uploads_assigned ON public.saree_uploads(assigned_tailor_id);

-- Allow assigned tailor to update completion flags
DROP POLICY IF EXISTS "tailor can mark assigned complete" ON public.saree_uploads;
CREATE POLICY "tailor can mark assigned complete" ON public.saree_uploads
  FOR UPDATE TO authenticated
  USING (assigned_tailor_id = auth.uid())
  WITH CHECK (assigned_tailor_id = auth.uid());

-- ============== tailor_profiles ==============
CREATE TABLE IF NOT EXISTS public.tailor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_photo text,
  studio_name text,
  owner_name text,
  experience_years integer,
  specialization text,
  location text,
  phone text,
  phone_visibility boolean NOT NULL DEFAULT false,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tailor_profiles TO authenticated;
GRANT ALL ON public.tailor_profiles TO service_role;
ALTER TABLE public.tailor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed in can view tailor profiles" ON public.tailor_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "tailor can insert own profile" ON public.tailor_profiles
  FOR INSERT TO authenticated WITH CHECK (tailor_id = auth.uid());
CREATE POLICY "tailor can update own profile" ON public.tailor_profiles
  FOR UPDATE TO authenticated USING (tailor_id = auth.uid()) WITH CHECK (tailor_id = auth.uid());

-- ============== reviews ==============
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tailor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL UNIQUE REFERENCES public.saree_uploads(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed in can read reviews" ON public.reviews
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "user can insert own review for completed request" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.saree_uploads s
      WHERE s.id = request_id AND s.user_id = auth.uid()
        AND s.assigned_tailor_id = reviews.tailor_id
        AND s.status = 'completed'
    )
  );
CREATE INDEX IF NOT EXISTS idx_reviews_tailor ON public.reviews(tailor_id);

-- ============== saved_tailors ==============
CREATE TABLE IF NOT EXISTS public.saved_tailors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tailor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tailor_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_tailors TO authenticated;
GRANT ALL ON public.saved_tailors TO service_role;
ALTER TABLE public.saved_tailors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own saves" ON public.saved_tailors
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============== portfolio_items ==============
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  before_image text,
  after_image text NOT NULL,
  title text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed in can view portfolio" ON public.portfolio_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "tailor manages own portfolio" ON public.portfolio_items
  FOR ALL TO authenticated USING (tailor_id = auth.uid()) WITH CHECK (tailor_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_portfolio_tailor ON public.portfolio_items(tailor_id);

-- ============== completed_projects ==============
CREATE TABLE IF NOT EXISTS public.completed_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.saree_uploads(id) ON DELETE CASCADE,
  tailor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completion_date timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.completed_projects TO authenticated;
GRANT ALL ON public.completed_projects TO service_role;
ALTER TABLE public.completed_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants can view their completions" ON public.completed_projects
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR tailor_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_completed_tailor ON public.completed_projects(tailor_id);
CREATE INDEX IF NOT EXISTS idx_completed_user ON public.completed_projects(user_id);

-- Trigger: when both confirm, mark completed + insert completed_projects
CREATE OR REPLACE FUNCTION public.handle_request_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tailor_marked_completed AND NEW.user_confirmed_completion AND NEW.status <> 'completed' THEN
    NEW.status := 'completed';
    INSERT INTO public.completed_projects (request_id, tailor_id, user_id)
    VALUES (NEW.id, NEW.assigned_tailor_id, NEW.user_id)
    ON CONFLICT (request_id) DO NOTHING;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_request_completion ON public.saree_uploads;
CREATE TRIGGER trg_request_completion BEFORE UPDATE ON public.saree_uploads
  FOR EACH ROW EXECUTE FUNCTION public.handle_request_completion();

-- updated_at trigger for tailor_profiles
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_tailor_profiles_touch ON public.tailor_profiles;
CREATE TRIGGER trg_tailor_profiles_touch BEFORE UPDATE ON public.tailor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
