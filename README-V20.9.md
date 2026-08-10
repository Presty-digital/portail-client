# Presty CRM V20.9

- Aucun changement de design.
- Le bouton « Mettre à jour les autorisations » reste supprimé.
- Correction du mapping des champs personnalisés GHL : utilisation de la version API HighLevel `2021-07-28` pour les Custom Fields, cohérente avec les autres appels GHL du projet.
- Résolution élargie des identifiants de champs (`id`, `_id`, `fieldId`, `customFieldId`, `fieldKey`, `key`) et des formats de réponse API (`customFields`, `fields`, `data`).
- Le fallback « Champ personnalisé X » n’est utilisé que lorsqu’aucun libellé réel n’est résolu.
