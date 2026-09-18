# PRESTY CRM V21.27

Correction ciblée du cycle OAuth GoHighLevel.

- Le bouton Rafraîchir utilise d’abord l’access token Company déjà enregistré.
- Aucun refresh token n’est consommé préventivement à cause de `expiresAt`.
- Rotation automatique uniquement après un vrai 401/403 HighLevel.
- Après rotation, le nouveau couple access/refresh est persisté depuis le dernier état Supabase pour limiter les écrasements concurrents.
- En cas de requêtes concurrentes, PRESTY relit le token le plus récent avant de tenter une rotation.
- Les Location Tokens sont recréés depuis le Company Token et réessayés après rotation si nécessaire.
- Pagination des installations conservée : jusqu’à 100 par page + nextPageToken.
- Aucun changement aux leads, webhooks, attributions clients, pipelines ou structure Supabase.
