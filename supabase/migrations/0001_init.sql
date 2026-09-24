-- Ender Chest v1: items, share_tokens, RLS, realtime

create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('text', 'link', 'file')),
  title       text,
  content     text,
  file_path   text,
  file_name   text,
  file_size   bigint,
  mime_type   text,
  source      text,
  pinned      boolean not null default false,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists items_user_created_idx on public.items (user_id, created_at desc);
create index if not exists items_expires_idx on public.items (expires_at) where expires_at is not null;

alter table public.items enable row level security;

create policy "items owner select" on public.items
  for select to authenticated using (auth.uid() = user_id);
create policy "items owner insert" on public.items
  for insert to authenticated with check (auth.uid() = user_id);
create policy "items owner update" on public.items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "items owner delete" on public.items
  for delete to authenticated using (auth.uid() = user_id);

-- Realtime: DELETE 이벤트에 user_id 필터를 적용하려면 replica identity full 필요
alter table public.items replica identity full;
alter publication supabase_realtime add table public.items;

create table if not exists public.share_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token_hash    text not null unique,
  label         text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

alter table public.share_tokens enable row level security;

create policy "share_tokens owner select" on public.share_tokens
  for select to authenticated using (auth.uid() = user_id);
create policy "share_tokens owner insert" on public.share_tokens
  for insert to authenticated with check (auth.uid() = user_id);
create policy "share_tokens owner update" on public.share_tokens
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "share_tokens owner delete" on public.share_tokens
  for delete to authenticated using (auth.uid() = user_id);
