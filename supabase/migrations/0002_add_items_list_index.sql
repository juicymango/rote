create index if not exists items_user_created_at_id_idx
  on public.items (user_id, created_at desc, id desc);
