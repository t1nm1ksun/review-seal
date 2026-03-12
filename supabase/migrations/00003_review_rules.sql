-- Review Rules (user-defined markdown rule sets)
create table public.review_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.review_rules enable row level security;
create policy "Users see own rules" on public.review_rules for select using (auth.uid() = user_id);
create policy "Users manage own rules" on public.review_rules for all using (auth.uid() = user_id);
