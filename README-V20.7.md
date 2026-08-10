# Presty CRM V20.7

- Remonte les vraies réponses de formulaires GHL et masque les métadonnées techniques (IP, FormId, SessionId, SubmissionId, SignatureHash…).
- Résout les IDs des champs personnalisés GHL vers leurs libellés grâce au scope `locations/customFields.readonly`.
- Historique métier : « Contact créé » et « Nouvelle soumission de formulaire » au lieu de « Import GHL ».
- Un même contact conserve plusieurs soumissions distinctes.
- Suppression du bloc technique « Origine GoHighLevel » de la fiche contact.
- Suppression du bandeau technique Company token dans l’admin.
- Sous-onglets client dans Paramètres > Synchronisations : Formulaires GoHighLevel / Campagnes Meta → GHL.
- Ajout d’un bouton admin « Mettre à jour les autorisations » pour réautoriser le nouveau scope GHL.

## Important
Dans HighLevel Marketplace > Auth, ajouter `locations/customFields.readonly`, puis déployer cette version et cliquer une fois sur « Mettre à jour les autorisations » dans l’admin Presty.
