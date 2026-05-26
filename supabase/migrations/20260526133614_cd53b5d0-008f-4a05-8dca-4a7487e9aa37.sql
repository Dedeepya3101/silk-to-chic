
-- Enum
create type public.app_role as enum ('user', 'tailor');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Guest',
  email text,
  city text,
  specialization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_all_auth" on public.profiles for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.get_role(_user_id uuid)
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = _user_id limit 1
$$;

-- Auto-create profile + role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role app_role;
begin
  _role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'user');
  insert into public.profiles (id, display_name, email, city, specialization)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'specialization'
  );
  insert into public.user_roles (user_id, role) values (new.id, _role);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Saree uploads
create table public.saree_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  title text,
  description text,
  occasion text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.saree_uploads to authenticated;
grant all on public.saree_uploads to service_role;
alter table public.saree_uploads enable row level security;
create policy "saree_owner_all" on public.saree_uploads for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saree_tailor_select" on public.saree_uploads for select to authenticated using (public.has_role(auth.uid(), 'tailor'));

-- Tailor requests (suggestions sent by tailors on a saree upload)
create table public.tailor_requests (
  id uuid primary key default gen_random_uuid(),
  saree_upload_id uuid not null references public.saree_uploads(id) on delete cascade,
  tailor_id uuid not null references auth.users(id) on delete cascade,
  suggested_style text,
  sleeves text,
  fabric_notes text,
  price numeric,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tailor_requests to authenticated;
grant all on public.tailor_requests to service_role;
alter table public.tailor_requests enable row level security;
create policy "tailor_req_tailor_manage" on public.tailor_requests for all to authenticated using (auth.uid() = tailor_id) with check (auth.uid() = tailor_id and public.has_role(auth.uid(), 'tailor'));
create policy "tailor_req_owner_select" on public.tailor_requests for select to authenticated using (
  exists (select 1 from public.saree_uploads s where s.id = saree_upload_id and s.user_id = auth.uid())
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  saree_upload_id uuid references public.saree_uploads(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages_participants_select" on public.messages for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages_sender_insert" on public.messages for insert to authenticated with check (auth.uid() = sender_id);

-- Storage bucket for saree images
insert into storage.buckets (id, name, public) values ('sarees', 'sarees', true)
  on conflict (id) do nothing;

create policy "sarees_public_read" on storage.objects for select using (bucket_id = 'sarees');
create policy "sarees_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'sarees' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "sarees_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'sarees' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "sarees_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sarees' and auth.uid()::text = (storage.foldername(name))[1]);
