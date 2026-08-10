# Presty CRM V20.2 — correction synchronisation GHL

- Conserve le token Company agence déjà obtenu en V20.1.
- Corrige les endpoints HighLevel OAuth serveur : `/oauth/installedLocations` et `/oauth/locationToken`.
- Utilise la version API `2021-07-28` attendue par LeadConnector.
- Filtre les installations actives avec `isInstalled=true`.
- Corrige l'affichage des erreurs HighLevel pour éviter `[object Object]`.
- Aucun changement de configuration Vercel requis par rapport à la V20.1.
