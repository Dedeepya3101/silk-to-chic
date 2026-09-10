
CREATE OR REPLACE FUNCTION public.notify_on_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s_user uuid;
  s_tailor uuid;
  recipient uuid;
  sender_name text;
  preview text;
BEGIN
  SELECT user_id, tailor_id INTO s_user, s_tailor FROM public.suggestions WHERE id = NEW.suggestion_id;
  IF NEW.user_id = s_user THEN
    recipient := s_tailor;
  ELSE
    recipient := s_user;
  END IF;

  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.user_id;
  sender_name := coalesce(sender_name, 'A MatchO member');
  preview := left(NEW.message, 120);

  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (
    recipient,
    sender_name || ' sent you a message',
    preview,
    CASE WHEN recipient = s_tailor
      THEN '/dashboard/tailor/messages?thread=' || NEW.suggestion_id::text
      ELSE '/dashboard/user/suggestions' END
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_user_on_suggestion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  member_name text;
BEGIN
  IF auth.uid() = NEW.user_id THEN
    SELECT display_name INTO member_name FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      NEW.tailor_id,
      coalesce(member_name, 'A member') || ' started a conversation',
      'A member started a conversation about their saree.',
      '/dashboard/tailor/messages?thread=' || NEW.id::text
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

REVOKE ALL ON FUNCTION public.notify_on_reply() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_user_on_suggestion() FROM PUBLIC, anon, authenticated;
