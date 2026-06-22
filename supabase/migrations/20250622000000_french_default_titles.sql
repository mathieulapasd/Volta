-- French default titles for workspaces and chats
-- Run after 20250621000000_remove_folders.sql

alter table public.workspaces
  alter column name set default 'Espace sans titre';

alter table public.chats
  alter column title set default 'Chat sans titre';

-- Backfill rows that still use the English defaults (unchanged user renames are kept)
update public.workspaces
set name = 'Espace sans titre'
where name = 'Untitled workspace';

update public.chats
set title = 'Chat sans titre'
where title = 'Untitled chat';
