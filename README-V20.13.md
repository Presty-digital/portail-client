# Presty CRM V20.13

Correction ciblée de la synchronisation GoHighLevel OAuth v3.

- `/oauth/installed-locations` reste utilisé en API v3.
- suppression des paramètres `skip` et `limit`, refusés par cet endpoint v3.
- aucun changement de design ou de logique métier.
- conservation de la régénération des Location Tokens pour récupérer les nouveaux scopes, dont `locations/customFields.readonly`.
