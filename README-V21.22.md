# PRESTY CRM V21.22 — Auto-réparation des tokens GHL par sous-compte

Base : V21.21.

## Correction

- Lorsqu’un refresh token GoHighLevel de type **Location** est refusé avec un message de type `This refresh token is invalid`, PRESTY ne reste plus bloqué sur ce token.
- Si le token agence **Company** est toujours valide, PRESTY recrée automatiquement un nouveau token du sous-compte via `/oauth/location-token`, remplace l’ancien token stocké et poursuit la synchronisation.
- Le bouton de rafraîchissement des sous-comptes régénère désormais directement les Location Tokens déjà expirés au lieu de tenter de conserver leur ancien refresh token.
- Aucun changement de données métier, attribution client, formulaire, contact ou pipeline.
- Le flux OAuth V21.21 reste inchangé.

## Objectif

Corriger les cas isolés où certains sous-comptes (par exemple un compte nouvellement créé ou anciennement autorisé) renvoient encore `This refresh token is invalid` alors que les autres sous-comptes fonctionnent.
