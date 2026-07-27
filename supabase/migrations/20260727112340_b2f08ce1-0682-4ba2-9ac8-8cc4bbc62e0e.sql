DROP TRIGGER IF EXISTS trg_handle_request_completion ON public.saree_uploads;
CREATE TRIGGER trg_handle_request_completion
BEFORE UPDATE ON public.saree_uploads
FOR EACH ROW EXECUTE FUNCTION public.handle_request_completion();