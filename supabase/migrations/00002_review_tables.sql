-- Reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  repo_full_name text not null,
  pr_number int not null,
  pr_title text not null,
  provider text not null check (provider in ('claude', 'openai')),
  prompt text not null,
  custom_instructions text,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'posted')),
  summary text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  posted_at timestamptz,
  github_review_id bigint,
  created_at timestamptz default now() not null
);

create index reviews_user_idx on public.reviews(user_id);
create index reviews_status_idx on public.reviews(status);
create index reviews_repo_pr_idx on public.reviews(repo_full_name, pr_number);

alter table public.reviews enable row level security;
create policy "Users see own reviews" on public.reviews for select using (auth.uid() = user_id);
create policy "Users create own reviews" on public.reviews for insert with check (auth.uid() = user_id);
create policy "Users update own reviews" on public.reviews for update using (auth.uid() = user_id);
create policy "Users delete own reviews" on public.reviews for delete using (auth.uid() = user_id);

-- Enable Realtime for reviews table
alter publication supabase_realtime add table public.reviews;

-- Review Comments
create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  file_path text not null,
  start_line int,
  end_line int,
  side text default 'RIGHT',
  body text not null,
  severity text default 'suggestion' check (severity in ('critical', 'warning', 'suggestion', 'praise')),
  created_at timestamptz default now() not null
);

create index review_comments_review_idx on public.review_comments(review_id);

alter table public.review_comments enable row level security;
create policy "Users see own review comments"
  on public.review_comments for select
  using (exists(select 1 from public.reviews where id = review_id and user_id = auth.uid()));
create policy "Users insert own review comments"
  on public.review_comments for insert
  with check (exists(select 1 from public.reviews where id = review_id and user_id = auth.uid()));
