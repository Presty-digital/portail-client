# PRESTY CRM V21.19

Base : V21.18.

## CRM
- Le filtre Statut devient multi-sélection.
- Plusieurs statuts peuvent être cochés simultanément.
- Chaque statut actif apparaît sous forme de filtre amovible.
- Réinitialisation globale conservée.

## Pipeline
- `Non qualifié` reste un type métier natif.
- Ajout du statut natif `Annulation` avec le type métier `cancelled`.
- `Non qualifié` et `Annulation` sont ajoutés automatiquement aux pipelines existants s'ils sont absents, avant les étapes terminales Gagné / Perdu.

## Actions
- Refonte des cartes « Actions à traiter » avec davantage d'informations :
  - type d'action ;
  - date et heure ;
  - contact ;
  - catégorie ;
  - statut actuel ;
  - coordonnées ;
  - commentaire attaché à l'action.
- Le commentaire saisi dans la fiche contact est désormais visible directement depuis l'onglet Actions.

## Rendez-vous
- Renommage de l'onglet en « RDV à confirmer ».
- Cartes rendez-vous enrichies : date/heure, contact, téléphone, demande et type de rendez-vous.
- Nouvelle logique de qualification du rendez-vous :
  - `No-show` ;
  - `Annulé` ;
  - `Présent`.
- `Présent` ouvre une fenêtre de résultat commercial :
  - `Vente réalisée` : montant obligatoire, puis passage automatique en Gagné ;
  - `Pas de vente` : montant désactivé, valeur remise à 0, puis passage en RDV réalisé.
- Le résultat est enregistré avec une date de confirmation.

## Déploiement
Pack complet prévu pour le workflow GitHub Web → Vercel, limité à 99 fichiers.
