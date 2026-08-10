# Presty CRM V20.6 — demandes multiples GoHighLevel

- Le contact et les soumissions de formulaires sont maintenant deux objets distincts.
- Un même contact conserve un historique `formSubmissions` avec plusieurs demandes.
- A chaque webhook ContactCreate / ContactUpdate, Presty interroge `GET /forms/submissions` avec le contactId afin de récupérer les vraies soumissions (formId, submissionId, createdAt et réponses `others`).
- Les soumissions sont dédupliquées par leur ID GHL : un même contact peut donc remplir plusieurs fois un ou plusieurs formulaires sans écraser ses réponses précédentes.
- La fiche contact affiche `Réponse formulaire 1`, `Réponse formulaire 2`, etc., avec la date, le formulaire et ses réponses.
- Les métadonnées techniques du webhook ne sont plus présentées comme des réponses de formulaire.

## HighLevel Marketplace
Conserver `ContactCreate` actif et activer également `ContactUpdate` afin de couvrir les nouvelles demandes d'un contact déjà existant.
