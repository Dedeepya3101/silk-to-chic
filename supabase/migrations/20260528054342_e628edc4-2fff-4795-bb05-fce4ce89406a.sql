ALTER PUBLICATION supabase_realtime ADD TABLE public.saree_uploads;
ALTER TABLE public.saree_uploads REPLICA IDENTITY FULL;