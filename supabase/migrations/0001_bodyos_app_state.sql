-- BodyOS cloud sync schema.
--
-- Applied to the shared Supabase project bvqvturqupbggxaeihvi via the Supabase
-- MCP. Kept here so the backend schema is reproducible and version-controlled
-- (standard Supabase CLI migrations path, if the CLI is ever adopted).
--
-- One row per user holds the whole AppData blob. Isolated from the other app
-- co-hosted in this project by table name + owner-only RLS.

create table if not exists public.bodyos_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  app_version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.bodyos_app_state enable row level security;

drop policy if exists "bodyos_owner_select" on public.bodyos_app_state;
create policy "bodyos_owner_select" on public.bodyos_app_state
  for select using (auth.uid() = user_id);

drop policy if exists "bodyos_owner_insert" on public.bodyos_app_state;
create policy "bodyos_owner_insert" on public.bodyos_app_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "bodyos_owner_update" on public.bodyos_app_state;
create policy "bodyos_owner_update" on public.bodyos_app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bodyos_owner_delete" on public.bodyos_app_state;
create policy "bodyos_owner_delete" on public.bodyos_app_state
  for delete using (auth.uid() = user_id);

-- Server-side stamp so updated_at reflects true last write (drives the
-- last-write-wins conflict resolution across devices). search_path pinned to
-- satisfy the security linter and avoid search_path hijacking.
create or replace function public.bodyos_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bodyos_app_state_touch on public.bodyos_app_state;
create trigger bodyos_app_state_touch
  before update on public.bodyos_app_state
  for each row execute function public.bodyos_touch_updated_at();
