create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('agency_admin','institut')),
  institut_id text,
  created_at timestamptz not null default now()
);

insert into public.app_state (id,payload)
values ('main','{}'::jsonb)
on conflict (id) do nothing;

alter table public.app_state enable row level security;
alter table public.profiles enable row level security;

-- Aucun accès direct navigateur : toutes les lectures/écritures passent par les routes API serveur.
revoke all on public.app_state from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
