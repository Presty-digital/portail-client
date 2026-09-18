# PRESTY CRM V21.28 — GHL Installed Accounts Safe Sync

Correction ciblée de la synchronisation quotidienne GoHighLevel.

- « Rafraîchir les sous-comptes » synchronise uniquement `/oauth/installed-locations`.
- Aucun Location Token n’est généré/renouvelé pendant la découverte des installations.
- Un HTTP 403 n’est plus interprété comme une expiration OAuth et ne déclenche plus de rotation du refresh token Company.
- Seul un HTTP 401 peut déclencher une rotation du Company token.
- Les Location Tokens restent générés à la demande lorsqu’une fonctionnalité d’un sous-compte en a réellement besoin.
- Pagination v3 conservée (`pageSize=100` + `nextPageToken`).
- Les attributions clients, webhooks, pipelines et données CRM ne sont pas modifiés.

Flux cible : installer Presty CRM dans HighLevel → Rafraîchir les sous-comptes → le nouveau sous-compte apparaît.
