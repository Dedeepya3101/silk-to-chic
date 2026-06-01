
-- suggestions table
CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saree_upload_id uuid NOT NULL REFERENCES public.saree_uploads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tailor_id uuid NOT NULL,
  silhouette text,
  sleeve_ideas text,
  color_suggestions text,
  stitching_notes text,
  best_fit text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestions_tailor_insert" ON public.suggestions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tailor_id AND public.has_role(auth.uid(), 'tailor'));

CREATE POLICY "suggestions_participants_select" ON public.suggestions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = tailor_id);

-- notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_owner_select" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_owner_update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- inserts happen via trigger (security definer); no direct insert policy needed

-- suggestion_replies table
CREATE TABLE public.suggestion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestion_replies TO authenticated;
GRANT ALL ON public.suggestion_replies TO service_role;
ALTER TABLE public.suggestion_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "replies_participants_select" ON public.suggestion_replies
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.suggestions s
    WHERE s.id = suggestion_id AND (s.user_id = auth.uid() OR s.tailor_id = auth.uid())
  ));

CREATE POLICY "replies_participants_insert" ON public.suggestion_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.suggestions s
      WHERE s.id = suggestion_id AND (s.user_id = auth.uid() OR s.tailor_id = auth.uid())
    )
  );

-- Trigger: create notification when suggestion is sent
CREATE OR REPLACE FUNCTION public.notify_user_on_suggestion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (
    NEW.user_id,
    'New Tailor Suggestion',
    'A tailor has sent a redesign idea for your saree.',
    '/dashboard/user/suggestions'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_suggestion
AFTER INSERT ON public.suggestions
FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_suggestion();

-- Trigger: notify tailor when user replies (and notify user when tailor replies)
CREATE OR REPLACE FUNCTION public.notify_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s_user uuid;
  s_tailor uuid;
  recipient uuid;
BEGIN
  SELECT user_id, tailor_id INTO s_user, s_tailor FROM public.suggestions WHERE id = NEW.suggestion_id;
  IF NEW.user_id = s_user THEN
    recipient := s_tailor;
  ELSE
    recipient := s_user;
  END IF;
  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (
    recipient,
    'New Reply',
    'You have a new reply on a suggestion.',
    CASE WHEN recipient = s_tailor THEN '/dashboard/tailor/messages' ELSE '/dashboard/user/suggestions' END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_reply
AFTER INSERT ON public.suggestion_replies
FOR EACH ROW EXECUTE FUNCTION public.notify_on_reply();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestion_replies;
