alter table public.profiles
  add column if not exists email_enabled boolean not null default false;
