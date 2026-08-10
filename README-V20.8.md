# Presty CRM V20.8

- Aucun changement de design de la fiche contact / historique des réponses.
- Suppression du bouton admin « Mettre à jour les autorisations ».
- Résolution automatique des vrais libellés des champs personnalisés GHL.
- Si un ancien token Location ne contient pas encore `locations/customFields.readonly`, Presty régénère automatiquement un token Location depuis le token Company puis retente l'appel, sans action utilisateur.
- Conservation du fallback « Champ personnalisé X » uniquement si HighLevel ne fournit réellement aucun libellé exploitable.
