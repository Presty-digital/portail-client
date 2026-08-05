# Portail Client Presty — V6 stable

Cette archive remplace volontairement tous les chemins créés par les versions V2, V3, V4 et V5. Elle est conçue pour être envoyée avec GitHub **Add file → Upload files**, sans suppression manuelle.

## Première installation
1. Exécuter `supabase-setup.sql` une seule fois.
2. Variables Vercel : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GHL_WEBHOOK_SECRET`, `APP_SESSION_SECRET`.
3. Uploader tout le contenu à la racine du même repository.
4. Ouvrir l’application et créer le premier compte administrateur.

## Mises à jour
La table `app_state` et la fonction `migrate()` conservent les données.
