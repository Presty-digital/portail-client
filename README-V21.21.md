# PRESTY CRM V21.21 — Correction OAuth GoHighLevel

Base fonctionnelle : V21.19, avec uniquement les corrections de reconnexion GHL introduites après le problème de refresh token.

## Correction principale

Le flux OAuth agence GoHighLevel utilise maintenant le lien officiel de la version Marketplace :

- endpoint `https://marketplace.gohighlevel.com/v2/oauth/chooselocation`
- `client_id` provenant de `GHL_CLIENT_ID`
- `version_id` provenant de `GHL_VERSION_ID`, `GHL_APP_VERSION_ID`, `GHL_APP_ID`, ou à défaut de la partie App ID du Client ID
- `redirect_uri` provenant de `GHL_REDIRECT_URI` ou du callback production Presty
- scopes identiques à ceux utilisés par le CRM

Cette correction répond à l'erreur HighLevel `error.noAppVersionIdFound` observée lorsque le CRM lançait une reconnexion sans `version_id` sur l'ancien endpoint OAuth.

## Interface administration

Les deux actions suivantes utilisent désormais le même flux OAuth officiel :

- `Reconnecter GoHighLevel`
- `+ Installer sur d’autres sous-comptes`

Le bouton `Rafraîchir les sous-comptes` reste séparé : il resynchronise les installations après autorisation mais ne remplace pas une reconnexion OAuth.

## Données

Aucune suppression ou migration des clients, contacts, formulaires, attributions de sous-comptes ou données Supabase n'est effectuée par cette version.
