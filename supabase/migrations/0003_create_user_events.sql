create table user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (
    event_name in (
      'item_created',
      'bulk_import_completed',
      'session_started',
      'session_completed',
      'session_save_failed'
    )
  ),
  created_at timestamptz not null default now()
);

alter table user_events enable row level security;

create policy "Users own their events" on user_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_events_user_created_at_idx
  on public.user_events (user_id, created_at desc);
