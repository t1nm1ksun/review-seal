-- Review Notifications (triggered by GitHub webhooks)
create table public.review_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  repo_full_name text not null,
  pr_number integer not null,
  pr_title text,
  comment_body text,
  comment_url text,
  severity text, -- highest severity found (P1, P2, etc.)
  read boolean not null default false,
  created_at timestamptz default now() not null
);

alter table public.review_notifications enable row level security;
create policy "Users see own notifications" on public.review_notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.review_notifications for update using (auth.uid() = user_id);

-- Webhook secrets per repo (to verify GitHub signatures)
create table public.repo_webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  repo_full_name text not null,
  webhook_id bigint not null,
  webhook_secret text not null,
  created_at timestamptz default now() not null,
  unique(user_id, repo_full_name)
);

alter table public.repo_webhooks enable row level security;
create policy "Users see own webhooks" on public.repo_webhooks for select using (auth.uid() = user_id);
create policy "Users manage own webhooks" on public.repo_webhooks for all using (auth.uid() = user_id);

-- Allow Edge Functions to insert notifications (service role)
-- Insert policy for service role is handled by service_role key bypassing RLS
