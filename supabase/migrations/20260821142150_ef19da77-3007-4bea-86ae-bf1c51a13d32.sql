-- AI style ideas generated for a saree upload
CREATE TABLE public.ai_style_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saree_upload_id uuid NOT NULL REFERENCES public.saree_uploads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ideas jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_idea jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_style_ideas TO authenticated;
GRANT ALL ON public.ai_style_ideas TO service_role;
ALTER TABLE public.ai_style_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their AI style ideas" ON public.ai_style_ideas
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view AI style ideas" ON public.ai_style_ideas
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- AI commerce assistant conversation history (per user)
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their AI chat" ON public.ai_chat_messages
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI tailor match results, stored so recommendations are explainable + auditable
CREATE TABLE public.ai_tailor_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saree_upload_id uuid NOT NULL REFERENCES public.saree_uploads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  matches jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tailor_matches TO authenticated;
GRANT ALL ON public.ai_tailor_matches TO service_role;
ALTER TABLE public.ai_tailor_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their AI tailor matches" ON public.ai_tailor_matches
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Selected AI style idea travels with the request so tailors see the brief
ALTER TABLE public.saree_uploads
  ADD COLUMN IF NOT EXISTS ai_style_note text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Lifecycle audit trail for requests (visible to the two parties + admins)
CREATE TABLE public.request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saree_upload_id uuid NOT NULL REFERENCES public.saree_uploads(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.request_status_history TO authenticated;
GRANT ALL ON public.request_status_history TO service_role;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties can view request history" ON public.request_status_history
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.saree_uploads s
      WHERE s.id = saree_upload_id
        AND (s.user_id = auth.uid() OR s.assigned_tailor_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.log_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.request_status_history (saree_upload_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_request_status_change ON public.saree_uploads;
CREATE TRIGGER trg_log_request_status_change
AFTER UPDATE ON public.saree_uploads
FOR EACH ROW EXECUTE FUNCTION public.log_request_status_change();

-- Prevent duplicate reviews per completed request
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_request ON public.reviews (request_id, user_id);