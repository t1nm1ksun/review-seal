-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  github_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;
create policy "Anyone can view profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, github_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'https://github.com/' || coalesce(new.raw_user_meta_data->>'user_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Monitored Repositories
create table public.monitored_repos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  github_repo_id bigint not null,
  owner text not null,
  name text not null,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null,
  unique(user_id, github_repo_id)
);

alter table public.monitored_repos enable row level security;
create policy "Users see own repos" on public.monitored_repos for select using (auth.uid() = user_id);
create policy "Users add own repos" on public.monitored_repos for insert with check (auth.uid() = user_id);
create policy "Users remove own repos" on public.monitored_repos for delete using (auth.uid() = user_id);

-- User Settings
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  default_provider text not null default 'claude' check (default_provider in ('claude', 'openai')),
  default_prompt text not null default 'review',
  claude_api_key_encrypted text,
  openai_api_key_encrypted text,
  github_token_encrypted text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.user_settings enable row level security;
create policy "Users see own settings" on public.user_settings for select using (auth.uid() = user_id);
create policy "Users update own settings" on public.user_settings for update using (auth.uid() = user_id);
create policy "Users insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users upsert own settings" on public.user_settings for all using (auth.uid() = user_id);

-- Auto-create settings on profile creation
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();
