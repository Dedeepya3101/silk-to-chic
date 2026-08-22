REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_request_completion() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_request_status_change() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_reply() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user_on_suggestion() FROM public, anon, authenticated;