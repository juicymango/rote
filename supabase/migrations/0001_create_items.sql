create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  next_review_at date not null default current_date,
  interval_days integer not null default 1,
  consecutive_correct integer not null default 0,
  created_at timestamptz not null default now()
);

alter table items enable row level security;

create policy "Users own their items" on items
  for all using (auth.uid() = user_id);
