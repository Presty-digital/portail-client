# Presty CRM V21.26 — GHL Installed Locations Source Fix

- Corrige la cause du compteur incohérent (ex. 52 disponibles alors que 23 installations existent dans HighLevel).
- `approvedLocations` du token Company n’est plus utilisé comme fallback pour les installations Marketplace.
- Source de vérité unique : `GET /oauth/installed-locations` avec `isInstalled=true`, `pageSize=100` et pagination `nextPageToken`.
- Lors d’une synchronisation réussie, les anciennes entrées fantômes sont marquées non installées et disparaissent de l’interface.
- En cas d’erreur HighLevel, le CRM affiche l’erreur au lieu d’inventer une liste à partir des comptes approuvés de l’agence.
- OAuth, webhooks, attributions clients, Supabase et flux leads inchangés.
