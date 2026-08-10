# Portail Presty V16

V16 ajoute :
- nettoyage et déduplication des métadonnées GoHighLevel dans les fiches contact ;
- archivage, réactivation et suppression définitive sécurisée des comptes clients ;
- exports CSV depuis Contacts et CRM, limités au compte et aux filtres actuellement affichés.

La structure Supabase `app_state` existante est conservée : aucune migration SQL manuelle n'est requise.


## V17 Meta Ads
- Connexion serveur à la Marketing API via `META_ACCESS_TOKEN`.
- Sélection d’un compte publicitaire Meta par compte client.
- Liste des campagnes et mapping campagne Meta → formulaire GHL.
- Onglet Publicité : dépenses, leads Meta, CPL, impressions, clics et CTR par période.
- Le token Meta n’est jamais exposé au navigateur.
