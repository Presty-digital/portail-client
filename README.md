# Portail Client Presty — V3

## Ce qui change

- Design premium inspiré des interfaces Apple, avec identité Presty.
- Connexion réelle à Supabase via les variables Vercel.
- Création du premier compte administrateur depuis `/initialisation`.
- Création automatique des comptes instituts depuis l’espace agence.
- Dashboard mensuel dynamique : CA, dépenses, ROI, CPL, RDV et conversions.
- Dépenses saisies par Presty et classées par catégorie / soin.
- CRM Kanban + Liste.
- Webhook GoHighLevel sécurisé.
- Données stockées dans un état JSON versionné et migré automatiquement, sur le modèle du CRM GHR.

## Initialisation unique

1. Dans Supabase → SQL Editor, exécuter `supabase-setup.sql` une seule fois.
2. Les variables suivantes doivent exister dans Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GHL_WEBHOOK_SECRET`
3. Redéployer Vercel.
4. Ouvrir `/initialisation` pour créer le premier compte administrateur Presty.

## Mises à jour futures

La fonction `migrate()` dans `lib/state.ts` fusionne les anciennes données avec la nouvelle structure. Les prochaines versions n’écrasent pas la base et ne suppriment pas les données existantes.
