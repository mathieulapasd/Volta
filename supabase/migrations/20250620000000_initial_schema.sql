-- Initial schema for Volta (fresh Supabase project)
-- Run manually in Supabase SQL Editor or via `supabase db push`

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables (FK order: workspaces → folders → chats → messages)
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Untitled workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  auth_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Untitled folder',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders (id) on delete cascade,
  auth_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled chat',
  unlayer_design jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id bigint generated always as identity primary key,
  auth_id uuid not null references auth.users (id) on delete cascade,
  chat_id uuid not null references public.chats (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  unlayer_design jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index folders_workspace_id_idx on public.folders (workspace_id);
create index chats_folder_id_idx on public.chats (folder_id);
create index messages_chat_id_created_at_idx on public.messages (chat_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

create trigger chats_set_updated_at
  before update on public.chats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.folders enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- workspaces
create policy "workspaces_select_own"
  on public.workspaces for select
  using (auth_id = auth.uid());

create policy "workspaces_insert_own"
  on public.workspaces for insert
  with check (auth_id = auth.uid());

create policy "workspaces_update_own"
  on public.workspaces for update
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

create policy "workspaces_delete_own"
  on public.workspaces for delete
  using (auth_id = auth.uid());

-- folders
create policy "folders_select_own"
  on public.folders for select
  using (auth_id = auth.uid());

create policy "folders_insert_own"
  on public.folders for insert
  with check (
    auth_id = auth.uid()
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.auth_id = auth.uid()
    )
  );

create policy "folders_update_own"
  on public.folders for update
  using (auth_id = auth.uid())
  with check (
    auth_id = auth.uid()
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.auth_id = auth.uid()
    )
  );

create policy "folders_delete_own"
  on public.folders for delete
  using (auth_id = auth.uid());

-- chats
create policy "chats_select_own"
  on public.chats for select
  using (auth_id = auth.uid());

create policy "chats_insert_own"
  on public.chats for insert
  with check (
    auth_id = auth.uid()
    and exists (
      select 1 from public.folders f
      join public.workspaces w on w.id = f.workspace_id
      where f.id = folder_id and f.auth_id = auth.uid() and w.auth_id = auth.uid()
    )
  );

create policy "chats_update_own"
  on public.chats for update
  using (auth_id = auth.uid())
  with check (
    auth_id = auth.uid()
    and exists (
      select 1 from public.folders f
      where f.id = folder_id and f.auth_id = auth.uid()
    )
  );

create policy "chats_delete_own"
  on public.chats for delete
  using (auth_id = auth.uid());

-- messages
create policy "messages_select_own"
  on public.messages for select
  using (auth_id = auth.uid());

create policy "messages_insert_own"
  on public.messages for insert
  with check (
    auth_id = auth.uid()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id and c.auth_id = auth.uid()
    )
  );

create policy "messages_update_own"
  on public.messages for update
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

create policy "messages_delete_own"
  on public.messages for delete
  using (auth_id = auth.uid());
