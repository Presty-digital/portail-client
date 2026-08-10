# Portail Presty V19 — GHL OAuth agence

V19 corrige la redirection OAuth GoHighLevel et remplace le modèle de Private Integration Token par une connexion OAuth centralisée.

## Variables Vercel
- `GHL_CLIENT_ID`
- `GHL_CLIENT_SECRET`
- `META_ACCESS_TOKEN`
- variables Supabase déjà existantes

## Redirect URL HighLevel
`https://portail-client-brown.vercel.app/api/integrations/crm/callback`

## Flux GHL
1. Installer Presty CRM depuis le lien de test/installation HighLevel sur un sous-compte autorisé.
2. HighLevel redirige vers `/api/integrations/crm/callback?code=...`.
3. Le serveur échange le code contre access/refresh tokens et les conserve dans Supabase, jamais dans le navigateur.
4. Admin Presty → Paramètres → Intégrations affiche l’état OAuth.
5. Admin Presty → Comptes clients → Configurer permet d’attribuer uniquement un sous-compte GHL déjà autorisé.
6. Le compte client peut ensuite synchroniser ses formulaires sans voir de token ni les autres sous-comptes.

Les access tokens expirés sont renouvelés automatiquement via le refresh token.
