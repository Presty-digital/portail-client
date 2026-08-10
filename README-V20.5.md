# Presty CRM V20.5 — Webhook Marketplace HighLevel

Correction de la remontée automatique des nouveaux contacts GoHighLevel.

## Changements

- Le webhook global `/api/webhook/ghl` accepte désormais les webhooks natifs de la Marketplace HighLevel.
- Vérification sécurisée de `X-GHL-Signature` en Ed25519 avec la clé publique officielle HighLevel.
- L'ancien `x-webhook-secret` reste accepté uniquement comme compatibilité avec les anciens tests/workflows manuels.
- Prise en charge de `ContactCreate` et `ContactUpdate`.
- Association automatique du `locationId` reçu par HighLevel au sous-compte déjà attribué dans Presty.
- Si `ContactCreate` ne fournit pas de `formId`, Presty tente aussi de reconnaître le formulaire à partir de `source` / nom du formulaire synchronisé.
- Les autres événements reçus par erreur sont acquittés sans créer de contact.

## Configuration HighLevel

Dans Marketplace > Advanced Settings > Webhooks :

- Default / External webhook URL : `https://portail-client-brown.vercel.app/api/webhook/ghl`
- `ContactCreate` : activé

Aucun header `x-webhook-secret` personnalisé n'est nécessaire pour le webhook Marketplace.

## Test

1. Déployer V20.5.
2. Créer un nouveau contact via un formulaire du sous-compte Inov'Esthétique.
3. Le contact doit apparaître automatiquement dans Contacts / CRM Presty.
4. En cas d'échec, consulter les Webhook Logs HighLevel : le statut HTTP permet de distinguer signature invalide (401), location non attribuée (404) ou erreur serveur (500).
