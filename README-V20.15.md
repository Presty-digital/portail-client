# Presty CRM V20.15

Correction ciblée des libellés de réponses GHL.

- conserve la récupération officielle des Custom Fields via `locations/customFields.readonly` ;
- ajoute un fallback serveur sur le widget public du formulaire GHL pour retrouver les libellés affichés quand le token OAuth ne fournit toujours pas le mapping ;
- aucun changement de design ;
- ajoute `publicFormMap` au diagnostic GHL pour vérifier le mapping de secours.
