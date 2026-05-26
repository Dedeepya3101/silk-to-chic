
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.has_role(uuid, app_role) from public, anon;
revoke all on function public.get_role(uuid) from public, anon;
grant execute on function public.has_role(uuid, app_role) to authenticated;
grant execute on function public.get_role(uuid) to authenticated;

drop policy if exists "sarees_public_read" on storage.objects;
