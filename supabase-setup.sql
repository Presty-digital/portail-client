-- Initialisation unique. Ce script ne supprime ni n'écrase aucune donnée.
create table if not exists public.presty_app_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 3,
  updated_at timestamptz not null default now()
);

insert into public.presty_app_state (id, payload, version)
values ('main', '{}'::jsonb, 3)
on conflict (id) do nothing;

alter table public.presty_app_state enable row level security;
-- Aucune policy navigateur : toutes les lectures/écritures passent par les routes serveur sécurisées.
