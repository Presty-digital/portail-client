# PRESTY CRM V21.20

Base : V21.19.

## Diagnostic GoHighLevel
- Ajout d’un bouton `Diagnostic` sur chaque sous-compte dans Administration > Paramètres > Intégrations > GoHighLevel.
- Le diagnostic est filtré par `locationId` afin de n’afficher que les événements du sous-compte sélectionné.
- Affichage des derniers événements webhook enregistrés pour le sous-compte.
- Affichage du formulaire détecté, du contact, du Form ID et du nombre de soumissions récupérées.
- Affichage des réponses que le CRM a réussi à interpréter.
- Affichage des données brutes `others` des dernières soumissions GHL.
- Affichage des erreurs de récupération de soumissions et de custom fields.
- Section technique détaillée disponible pour investiguer les mappings de champs.
- Si aucun diagnostic n’existe encore, l’interface demande d’envoyer un formulaire test puis de rouvrir le diagnostic.

## Sécurité
- La route de diagnostic reste réservée aux utilisateurs `agency_admin`.
- Les diagnostics ne sont jamais rendus disponibles dans les espaces clients.

## Déploiement
Pack complet limité à 99 fichiers pour le workflow GitHub Web → Vercel.
