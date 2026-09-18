# PRESTY CRM V21.31 — GHL Production Stabilization

Audit ciblé production :
- utilise uniquement l’endpoint HighLevel v3 actuel `/oauth/installed-locations` ;
- pagination v3 `pageSize=100` + `pageToken` ;
- lit la réponse v3 `items` afin de restaurer les vrais noms des sous-comptes ;
- ajoute `versionId` à la requête d’installations ;
- aucune synchronisation GHL en arrière-plan lors du chargement des écrans ;
- `/api/ghl/locations` ne synchronise que si `sync=1` est explicitement demandé ;
- les écrans clients utilisent `sync=0` ;
- le retour OAuth recharge seulement l’état local et ne lance pas automatiquement une synchronisation ;
- le bouton admin « Rafraîchir les sous-comptes » reste l’unique déclencheur explicite de la découverte GHL ;
- conservation de la protection V21.30 empêchant les sauvegardes CRM ordinaires d’écraser `ghlOAuth`.

Aucun changement sur les leads, pipelines, affectations, webhooks métier ou schéma Supabase.
