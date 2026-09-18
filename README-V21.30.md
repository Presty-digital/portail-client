# PRESTY CRM V21.30 — GHL OAuth Stability Audit

Correctif chirurgical du flux GoHighLevel sans modification du CRM métier.

- protège `ghlOAuth` contre les écrasements par les sauvegardes concurrentes du CRM/webhooks ;
- revient à l’endpoint HighLevel stable `/oauth/installedLocations` (Version `2021-07-28`) ;
- demande 100 installations par page au lieu de la limite historique ;
- conserve les noms/adresses fournis par HighLevel ;
- le bouton de synchronisation ne crée pas de Location Token ;
- seuls les flux OAuth explicites peuvent modifier les secrets OAuth.
