-- Company-based multi-tenancy: multiple users share workspaces, chats, and messages.
-- workspaces.auth_id and chats/messages.auth_id are kept as "created_by" (author),
-- access control now flows through company membership.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index company_members_user_id_idx on public.company_members (user_id);

alter table public.workspaces add column company_id uuid references public.companies (id) on delete cascade;

alter table public.messages add column author_email text;

-- ---------------------------------------------------------------------------
-- updated_at trigger for companies
-- ---------------------------------------------------------------------------

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helper functions (security definer so RLS policies can use them
-- without recursing into the tables they protect)
-- ---------------------------------------------------------------------------

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = p_workspace_id and public.is_company_member(w.company_id)
  );
$$;

create or replace function public.is_chat_member(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chats c
    where c.id = p_chat_id and public.is_workspace_member(c.workspace_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Backfill: one company per existing workspace owner
-- ---------------------------------------------------------------------------

do $$
declare
  rec record;
  new_company_id uuid;
begin
  for rec in select distinct auth_id from public.workspaces loop
    insert into public.companies (name)
    values (
      coalesce(
        (select email from auth.users where id = rec.auth_id),
        'Company ' || left(rec.auth_id::text, 8)
      )
    )
    returning id into new_company_id;

    insert into public.company_members (company_id, user_id)
    values (new_company_id, rec.auth_id);

    update public.workspaces
    set company_id = new_company_id
    where auth_id = rec.auth_id;
  end loop;
end $$;

update public.messages m
set author_email = u.email
from auth.users u
where m.auth_id = u.id and m.author_email is null;

alter table public.workspaces alter column company_id set not null;

create index workspaces_company_id_idx on public.workspaces (company_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

-- companies: visible to and editable by members
create policy "companies_select_member"
  on public.companies for select
  using (public.is_company_member(id));

create policy "companies_update_member"
  on public.companies for update
  using (public.is_company_member(id))
  with check (public.is_company_member(id));

-- company_members: a user can read their own membership rows
create policy "company_members_select_own"
  on public.company_members for select
  using (user_id = auth.uid());

-- workspaces: membership-based access
drop policy if exists "workspaces_select_own" on public.workspaces;
drop policy if exists "workspaces_insert_own" on public.workspaces;
drop policy if exists "workspaces_update_own" on public.workspaces;
drop policy if exists "workspaces_delete_own" on public.workspaces;

create policy "workspaces_select_member"
  on public.workspaces for select
  using (public.is_company_member(company_id));

create policy "workspaces_insert_member"
  on public.workspaces for insert
  with check (auth_id = auth.uid() and public.is_company_member(company_id));

create policy "workspaces_update_member"
  on public.workspaces for update
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

create policy "workspaces_delete_member"
  on public.workspaces for delete
  using (public.is_company_member(company_id));

-- chats: access via workspace -> company membership
drop policy if exists "chats_select_own" on public.chats;
drop policy if exists "chats_insert_own" on public.chats;
drop policy if exists "chats_update_own" on public.chats;
drop policy if exists "chats_delete_own" on public.chats;

create policy "chats_select_member"
  on public.chats for select
  using (public.is_workspace_member(workspace_id));

create policy "chats_insert_member"
  on public.chats for insert
  with check (auth_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "chats_update_member"
  on public.chats for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "chats_delete_member"
  on public.chats for delete
  using (public.is_workspace_member(workspace_id));

-- messages: access via chat -> workspace -> company membership
drop policy if exists "messages_select_own" on public.messages;
drop policy if exists "messages_insert_own" on public.messages;
drop policy if exists "messages_update_own" on public.messages;
drop policy if exists "messages_delete_own" on public.messages;

create policy "messages_select_member"
  on public.messages for select
  using (public.is_chat_member(chat_id));

create policy "messages_insert_member"
  on public.messages for insert
  with check (auth_id = auth.uid() and public.is_chat_member(chat_id));

create policy "messages_update_member"
  on public.messages for update
  using (public.is_chat_member(chat_id))
  with check (public.is_chat_member(chat_id));

create policy "messages_delete_member"
  on public.messages for delete
  using (public.is_chat_member(chat_id));
