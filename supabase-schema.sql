-- Run this in your Supabase SQL Editor to set up the skins table.

create table if not exists public.skins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  tags        text[] not null default '{}',
  pixels      text not null,              -- base64 PNG data
  body_type   text not null default 'classic' check (body_type in ('classic', 'slim')),
  preview_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.skins enable row level security;

-- Users can only read/write their own skins
create policy "Users can manage their own skins"
  on public.skins
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger skins_updated_at
  before update on public.skins
  for each row execute procedure update_updated_at();
