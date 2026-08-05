-- Initialisation unique et non destructive du Portail Presty.
create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Aucun accès direct depuis le navigateur : toutes les lectures/écritures passent
-- par les routes API serveur avec la service_role key.
revoke all on public.app_state from anon, authenticated;

insert into public.app_state (id, payload)
values ('presty-global', '{"version":3,"instituts":[],"leads":[],"expenses":[],"campaigns":[],"reviews":[]}'::jsonb)
on conflict (id) do nothing;
