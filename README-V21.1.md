# Presty CRM V21.1 — Suivi des demandes

Évolution de la V21 :
- La fiche contact affiche désormais `SUIVI DES DEMANDES` sans texte explicatif inutile.
- Chaque catégorie est une demande/opportunité indépendante.
- Chaque demande possède son statut, sa valeur, son rendez-vous, sa prochaine action, la date de prochaine action et ses commentaires.
- Suppression du bloc global `RELANCES & RENDEZ-VOUS` et du champ `Type de rendez-vous`.
- Suppression du bloc global `COMMENTAIRES` : les commentaires sont désormais rattachés à la catégorie concernée.
- Le CRM liste/pipeline utilise le rendez-vous, les relances et commentaires de la catégorie correspondante.
- La page Rendez-vous lit également les rendez-vous par catégorie afin qu'un second rendez-vous sur une autre demande n'écrase pas le premier.
- Compatibilité des anciennes données : les données globales existantes restent utilisées comme fallback pour la catégorie historique tant qu'elles n'ont pas été enregistrées dans le nouveau suivi.

La logique GoHighLevel / formulaires de la V20.17/V21 n'a pas été modifiée.
