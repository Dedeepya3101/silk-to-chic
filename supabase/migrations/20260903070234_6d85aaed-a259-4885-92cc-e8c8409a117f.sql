CREATE POLICY "suggestions_user_insert" ON public.suggestions
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.saree_uploads u
    WHERE u.id = suggestions.saree_upload_id AND u.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.notify_user_on_suggestion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() = NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      NEW.tailor_id,
      'New Conversation',
      'A member started a conversation about their saree.',
      '/dashboard/tailor/messages'
    );
  ELSE
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      NEW.user_id,
      'New Tailor Suggestion',
      'A tailor has sent a redesign idea for your saree.',
      '/dashboard/user/suggestions'
    );
  END IF;
  RETURN NEW;
END;
$function$;