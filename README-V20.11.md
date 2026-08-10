# Presty CRM V20.11

Correction ciblée de l’autorisation GHL Custom Fields.

- API OAuth HighLevel migrée vers la version v3.
- Génération des Location tokens via `/oauth/location-token` (endpoint v3).
- Une nouvelle autorisation Company efface les anciens Location tokens mis en cache.
- Les Location tokens sont automatiquement régénérés si `locations/customFields.readonly` manque.
- L’appel Custom Fields utilise `Version: v3`.
- Aucun changement de design.
