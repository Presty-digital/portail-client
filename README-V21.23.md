# PRESTY CRM — V21.23

Base : V21.22 GHL Token Recovery.

## Correction GoHighLevel — plus de 20 sous-comptes

HighLevel OAuth v3 pagine désormais `GET /oauth/installed-locations` avec `pageSize` (20 par défaut) et `pageToken`. V21.22 effectuait une seule requête sans `pageSize`, ce qui limitait la liste visible dans PRESTY CRM aux 20 premières installations.

V21.23 :
- demande `pageSize=100` ;
- suit `pagination.nextPageToken` tant qu'une page suivante existe ;
- agrège et déduplique les sous-comptes avant la synchronisation ;
- conserve la récupération de Location Tokens de V21.22 ;
- ne modifie ni les attributions clients, ni les webhooks, ni la structure Supabase, ni le flux OAuth de reconnexion.

Après déploiement : Administration > Paramètres agence > GoHighLevel > **Rafraîchir les sous-comptes**. Les installations au-delà de 20 doivent alors apparaître.
