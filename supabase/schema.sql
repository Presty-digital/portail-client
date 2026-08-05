-- PORTAIL CLIENT PRESTY V2 — schéma complet Supabase
create extension if not exists pgcrypto;

create table if not exists public.instituts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ville text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('agency_admin','institut')),
  institut_id uuid references public.instituts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profiles_role_institut check (
    (role='agency_admin' and institut_id is null) or
    (role='institut' and institut_id is not null)
  )
);

create table if not exists public.categories_campagnes (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique check (nom in ('Minceur','Visage','Épilation','Autres')),
  ordre int not null default 0,
  active boolean not null default true
);

insert into public.categories_campagnes (nom,ordre) values
 ('Minceur',1),('Visage',2),('Épilation',3),('Autres',4)
on conflict (nom) do update set ordre=excluded.ordre;

create table if not exists public.campagnes_soins (
  id uuid primary key default gen_random_uuid(),
  institut_id uuid not null references public.instituts(id) on delete cascade,
  categorie_id uuid not null references public.categories_campagnes(id),
  nom text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(institut_id,nom)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  institut_id uuid not null references public.instituts(id) on delete cascade,
  campagne_soin_id uuid references public.campagnes_soins(id) on delete set null,
  date_contact date not null default current_date,
  prenom text,
  nom text,
  telephone text,
  email text,
  source text,
  type_soin text,
  problematique text,
  disponibilites text,
  informations text,
  statut text not null default 'Non qualifié' check (statut in ('Non qualifié','Appel 1','Appel 2','RDV fixé','Client converti','Perdu')),
  creneau_rdv timestamptz,
  presence text check (presence is null or presence in ('Oui','Non','Annulé')),
  converti_patient boolean not null default false,
  valeur_client numeric(12,2),
  notes text,
  prochaine_action timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.depenses_publicitaires (
  id uuid primary key default gen_random_uuid(),
  institut_id uuid not null references public.instituts(id) on delete cascade,
  campagne_soin_id uuid not null references public.campagnes_soins(id) on delete cascade,
  annee int not null check (annee between 2020 and 2100),
  mois int not null check (mois between 1 and 12),
  montant numeric(12,2) not null default 0 check (montant >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(institut_id,campagne_soin_id,annee,mois)
);

create table if not exists public.avis_google (
  id uuid primary key default gen_random_uuid(),
  institut_id uuid not null references public.instituts(id) on delete cascade,
  date_avis date not null default current_date,
  note int check (note between 1 and 5),
  texte text,
  reponse_envoyee boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.instituts enable row level security;
alter table public.profiles enable row level security;
alter table public.categories_campagnes enable row level security;
alter table public.campagnes_soins enable row level security;
alter table public.leads enable row level security;
alter table public.depenses_publicitaires enable row level security;
alter table public.avis_google enable row level security;

create or replace function public.my_role() returns text language sql security definer stable set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.my_institut_id() returns uuid language sql security definer stable set search_path=public as $$ select institut_id from public.profiles where id=auth.uid() $$;
revoke all on function public.my_role() from public;
revoke all on function public.my_institut_id() from public;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_institut_id() to authenticated;

create policy profiles_self on public.profiles for select to authenticated using (id=auth.uid());
create policy instituts_agency_all on public.instituts for all to authenticated using (public.my_role()='agency_admin') with check (public.my_role()='agency_admin');
create policy instituts_self_only on public.instituts for select to authenticated using (public.my_role()='institut' and id=public.my_institut_id());
create policy categories_authenticated_read on public.categories_campagnes for select to authenticated using (true);
create policy categories_agency_write on public.categories_campagnes for all to authenticated using (public.my_role()='agency_admin') with check (public.my_role()='agency_admin');
create policy campagnes_agency_all on public.campagnes_soins for all to authenticated using (public.my_role()='agency_admin') with check (public.my_role()='agency_admin');
create policy campagnes_institut_read_own on public.campagnes_soins for select to authenticated using (public.my_role()='institut' and institut_id=public.my_institut_id());
create policy leads_agency_all on public.leads for all to authenticated using (public.my_role()='agency_admin') with check (public.my_role()='agency_admin');
create policy leads_institut_read_own on public.leads for select to authenticated using (public.my_role()='institut' and institut_id=public.my_institut_id());
create policy leads_institut_update_own on public.leads for update to authenticated using (public.my_role()='institut' and institut_id=public.my_institut_id()) with check (public.my_role()='institut' and institut_id=public.my_institut_id());
create policy depenses_agency_all on public.depenses_publicitaires for all to authenticated using (public.my_role()='agency_admin') with check (public.my_role()='agency_admin');
create policy depenses_institut_read_own on public.depenses_publicitaires for select to authenticated using (public.my_role()='institut' and institut_id=public.my_institut_id());
create policy avis_agency_all on public.avis_google for all to authenticated using (public.my_role()='agency_admin') with check (public.my_role()='agency_admin');
create policy avis_institut_read_own on public.avis_google for select to authenticated using (public.my_role()='institut' and institut_id=public.my_institut_id());

create index if not exists leads_institut_date_idx on public.leads(institut_id,date_contact desc);
create index if not exists leads_institut_campagne_idx on public.leads(institut_id,campagne_soin_id);
create index if not exists depenses_institut_periode_idx on public.depenses_publicitaires(institut_id,annee,mois);
