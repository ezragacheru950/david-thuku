-- Supabase schema for the Dave and Eve private messaging app
-- Update the email addresses below to match the two authentication users you create for David and Eve.

create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

create index if not exists messages_sender_id_idx
  on public.messages (sender_id);

create index if not exists messages_created_at_idx
  on public.messages (created_at desc);

alter table public.messages enable row level security;

create policy "David and Eve can view messages"
  on public.messages
  for select
  using (
    auth.uid() is not null
    and auth.email() in ('david@example.com', 'eve@example.com')
  );

create policy "David and Eve can insert messages"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and auth.uid() is not null
    and auth.email() in ('david@example.com', 'eve@example.com')
  );

-- Optional: prevent updates/deletes unless you explicitly want them later.
create policy "No updates allowed"
  on public.messages
  for update
  using (false);

create policy "No deletes allowed"
  on public.messages
  for delete
  using (false);
