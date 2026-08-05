# Portail Client Presty — V7 stable

## Correctif principal

La route `/api/setup` crée désormais réellement le premier compte administrateur :
- vérification qu’aucun administrateur n’existe ;
- validation email / mot de passe ;
- hachage du mot de passe ;
- enregistrement dans l’état Supabase `app_state` ;
- ouverture immédiate d’une session sécurisée ;
- redirection automatique vers l’espace administrateur.

Les variantes historiques `route.js` et `route.ts` contiennent volontairement la même implémentation afin qu’un upload GitHub remplace correctement les fichiers des versions précédentes.

## Variables Vercel

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_SESSION_SECRET`
- `GHL_WEBHOOK_SECRET`

## Initialisation Supabase

Exécuter `supabase-setup.sql` une seule fois. Les versions suivantes conservent la même ligne `presty-main` et migrent le JSON sans supprimer les données.
