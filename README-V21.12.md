# Presty CRM V21.12 — Meta Dashboard stable

Correctifs principaux :

- Le Tableau de bord utilise désormais la même source Meta Ads que l'onglet Publicité pour les dépenses.
- La période `Maximum` utilise le preset Meta `maximum` au lieu d'une date arbitraire fixée à 2020.
- Si Meta refuse le preset `maximum`, l'API découpe automatiquement l'historique par année puis additionne les résultats par campagne.
- Lors d'un changement de période ou de compte client, une ancienne dépense Meta ne peut plus être brièvement affichée pour le mauvais compte.
- Une erreur Meta n'est plus transformée silencieusement en `0 €` : le dashboard affiche un état de synchronisation ou `—` / `Dépenses Meta indisponibles`.
- CPL et ROI ne sont calculés que lorsque la dépense Meta de la période courante est réellement disponible.

Base : V21.11.
