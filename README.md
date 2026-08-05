# Portail Client Presty — V4

Base propre et déployable Next.js + Supabase + Vercel.

## Architecture

- Authentification Supabase email/mot de passe.
- Compte `agency_admin` avec visibilité globale.
- Création des comptes instituts depuis l'application.
- Une table `app_state` JSON versionnée, migrée automatiquement sans suppression des données.
- Une table `profiles` pour les rôles et le rattachement des utilisateurs.
- Les données métier ne sont jamais accessibles directement depuis le navigateur : les routes API serveur utilisent la clé service role.

## Installation unique

1. Remplacer entièrement le contenu du repository par celui de cette archive.
2. Dans Supabase → SQL Editor, exécuter `supabase-setup.sql` une seule fois.
3. Vérifier dans Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GHL_WEBHOOK_SECRET`
4. Redéployer.
5. Ouvrir `/initialisation` et créer le premier compte administrateur.
6. Se connecter sur `/login`, puis créer les comptes instituts depuis la rubrique Instituts.

## Mises à jour futures

La fonction `migrate()` de `lib/state.js` complète automatiquement les structures anciennes. Une nouvelle version ne doit jamais contenir de suppression de la table `app_state` ni de remise à zéro du `payload`.

## Sécurité

- La clé `SUPABASE_SERVICE_ROLE_KEY` est utilisée uniquement dans `lib/server.js` et les routes API serveur.
- Les instituts ne reçoivent qu'un état filtré sur leur propre `institut_id`.
- Les écritures institut ne peuvent modifier que leurs propres prospects.
