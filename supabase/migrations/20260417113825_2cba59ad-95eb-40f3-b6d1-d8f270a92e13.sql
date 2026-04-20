-- =========================================
-- Helper: updated_at trigger function
-- =========================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================
-- PROFILES
-- =========================================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  display_name text,
  timezone text not null default 'UTC',
  delivery_time time not null default '07:00',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================
-- TOPICS
-- =========================================
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_topics_user on public.topics(user_id);

alter table public.topics enable row level security;

create policy "Users can view own topics"
  on public.topics for select
  using (auth.uid() = user_id);

create policy "Users can insert own topics"
  on public.topics for insert
  with check (auth.uid() = user_id);

create policy "Users can update own topics"
  on public.topics for update
  using (auth.uid() = user_id);

create policy "Users can delete own topics"
  on public.topics for delete
  using (auth.uid() = user_id);

-- =========================================
-- ARTICLES
-- =========================================
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  url text not null,
  url_hash text not null,
  source text not null,
  raw_text text,
  summary text,
  relevance_score numeric(3,2),
  velocity text check (velocity in ('hot', 'rising', 'steady')),
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, url_hash)
);

create index idx_articles_user on public.articles(user_id);
create index idx_articles_user_fetched on public.articles(user_id, fetched_at desc);

alter table public.articles enable row level security;

create policy "Users can view own articles"
  on public.articles for select
  using (auth.uid() = user_id);

create policy "Users can delete own articles"
  on public.articles for delete
  using (auth.uid() = user_id);

-- Inserts/updates happen via service role in edge functions; no client-side insert policy needed.

-- =========================================
-- BRIEFINGS
-- =========================================
create table public.briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  briefing_date date not null,
  title text,
  summary text,
  content jsonb,
  article_ids uuid[] default '{}',
  delivered_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

create index idx_briefings_user on public.briefings(user_id);
create index idx_briefings_user_date on public.briefings(user_id, briefing_date desc);

alter table public.briefings enable row level security;

create policy "Users can view own briefings"
  on public.briefings for select
  using (auth.uid() = user_id);

create policy "Users can update own briefings"
  on public.briefings for update
  using (auth.uid() = user_id);

create trigger update_briefings_updated_at
  before update on public.briefings
  for each row execute function public.update_updated_at_column();

-- =========================================
-- FEEDBACK
-- =========================================
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.articles(id) on delete cascade,
  briefing_id uuid references public.briefings(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  reason text,
  created_at timestamptz not null default now()
);

create index idx_feedback_user on public.feedback(user_id);

alter table public.feedback enable row level security;

create policy "Users can view own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

create policy "Users can insert own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can update own feedback"
  on public.feedback for update
  using (auth.uid() = user_id);

create policy "Users can delete own feedback"
  on public.feedback for delete
  using (auth.uid() = user_id);