-- Remove folders layer: workspaces → chats → messages
-- Run after 20250620000000_initial_schema.sql if folders already exist

alter table public.chats add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;

update public.chats c
set workspace_id = f.workspace_id
from public.folders f
where c.folder_id = f.id
  and c.workspace_id is null;

-- Drop RLS policies that reference folder_id before dropping the column
drop policy if exists "chats_insert_own" on public.chats;
drop policy if exists "chats_update_own" on public.chats;

alter table public.chats drop constraint if exists chats_folder_id_fkey;
alter table public.chats drop column if exists folder_id;

alter table public.chats alter column workspace_id set not null;

drop index if exists public.chats_folder_id_idx;
create index if not exists chats_workspace_id_idx on public.chats (workspace_id);

drop table if exists public.folders cascade;

create policy "chats_insert_own"
  on public.chats for insert
  with check (
    auth_id = auth.uid()
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.auth_id = auth.uid()
    )
  );

create policy "chats_update_own"
  on public.chats for update
  using (auth_id = auth.uid())
  with check (
    auth_id = auth.uid()
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.auth_id = auth.uid()
    )
  );
