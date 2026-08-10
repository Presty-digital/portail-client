# Presty CRM V21.0

Évolution du CRM autour d'un contact unique pouvant avoir plusieurs catégories CRM.

- Les catégories proviennent uniquement de Paramètres → CRM et des associations formulaires → catégories dans Synchronisations.
- Une nouvelle soumission GHL ajoute sa catégorie sans écraser les précédentes.
- Chaque catégorie possède son suivi commercial indépendant (statut + valeur).
- Le CRM affiche une opportunité par couple contact × catégorie ; un même contact peut donc apparaître dans plusieurs catégories/pipelines.
- La fiche contact affiche les badges de catégories, les coordonnées et un bloc de suivi commercial par catégorie.
- Le nom du formulaire est conservé uniquement dans l'historique des soumissions.
- La logique GHL validée en V20.17 pour les vraies questions/réponses est conservée.
- Les statistiques de CA tiennent compte des ventes par catégorie.
