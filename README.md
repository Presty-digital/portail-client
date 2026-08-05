# Portail Presty — V3 Pro

## Fonctionnalités

- Premier compte administrateur créé depuis `/initialisation`.
- L'administrateur voit tous les instituts, prospects, dépenses et statistiques.
- Création automatique des comptes instituts depuis le portail.
- Dashboard mensuel : CA, dépenses, ROI, CPL, rendez-vous, présence et conversion.
- CRM Kanban.
- Catégories Minceur, Visage, Épilation et Autres.
- Dépenses publicitaires saisies par Presty et rattachées à une campagne.
- Webhook GoHighLevel sécurisé.
- État JSON versionné avec migration automatique non destructive, sur le modèle GHR.

## Installation unique

1. Remplacer entièrement le contenu de l'ancien repository par cette version. Les anciens fichiers non présents dans cette archive doivent être supprimés.
2. Dans Supabase > SQL Editor, exécuter `supabase-setup.sql` une seule fois.
3. Vérifier dans Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GHL_WEBHOOK_SECRET`
4. Redéployer.
5. Ouvrir `/initialisation` et créer le compte administrateur Presty.

## Mises à jour futures

La fonction `migrate()` dans `lib/state.js` complète les anciens états avec les nouveaux champs. Les futures versions conservent le même projet Supabase et la même ligne `app_state`. Aucune suppression de table ni réinitialisation des données n'est nécessaire.

## Sécurité

La table `app_state` n'est pas accessible directement depuis les clés navigateur. Les accès passent par les routes serveur. Chaque requête authentifiée est filtrée selon le rôle et l'identifiant de l'institut. La clé `SUPABASE_SERVICE_ROLE_KEY` reste exclusivement côté serveur.
