# Presty CRM V20.14

Correction ciblée du mapping des libellés GHL :

- ne dépend plus du champ `scope` du Company Token pour savoir si un scope Sub-Account est disponible ;
- régénère un Location Token si `locations/customFields.readonly` manque ;
- le Location Token généré devient la source de vérité pour les permissions du sous-compte ;
- récupération des Custom Fields avec repli `v3` -> `2023-02-21` ;
- aucun changement de design ou de logique CRM.
