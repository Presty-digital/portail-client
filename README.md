# Portail Presty — V18

## Nouveauté principale
Synchronisation automatique des formulaires GoHighLevel.

- Le Location ID continue de router les webhooks entrants.
- Un **Private Integration Token GHL** de sous-compte, avec le scope `forms.readonly`, est enregistré côté serveur depuis l’administration Presty.
- Le token n’est jamais renvoyé dans `/api/state` et n’est pas exposé aux comptes clients.
- `Paramètres → Intégrations → GoHighLevel` récupère automatiquement les formulaires du sous-compte.
- Les catégories CRM restent configurables dans Presty et sont conservées lors des resynchronisations.
- Le mapping **Campagne Meta → Formulaire GHL** utilise directement la liste synchronisée.

## Configuration GHL
Pour chaque sous-compte GHL :
1. créer un Private Integration Token au niveau du sous-compte ;
2. lui donner au minimum le scope `forms.readonly` ;
3. dans Presty, compte admin → Configurer le client → GoHighLevel, renseigner le Location ID et le token ;
4. ouvrir l’espace client → Paramètres : les formulaires sont synchronisés automatiquement. Le bouton « Synchroniser les formulaires » permet de forcer une actualisation.

Le webhook existant `/api/webhook/ghl` et `GHL_WEBHOOK_SECRET` restent inchangés.


## V19.2 — architecture intégrations
- Connexions globales GHL/Meta uniquement côté administration Presty.
- Attribution GHL + Meta depuis Comptes clients → Configurer.
- Côté client, l’onglet est renommé Synchronisations et ne permet plus de choisir les comptes.
- OAuth GHL agence corrigé : token Company, récupération des locations installées, échange en tokens Location.
- Scopes HighLevel supplémentaires requis : oauth.readonly et oauth.write.

## V20 — GoHighLevel agence centralisé

- Le compte agence HighLevel est autorisé une seule fois via OAuth Marketplace.
- Le token `Company` et son refresh token restent côté serveur ; ils ne sont jamais renvoyés au navigateur.
- Les sous-comptes où Presty CRM est installé sont récupérés avec l'API OAuth HighLevel puis deviennent attribuables dans Admin → Comptes clients → Configurer.
- Un token `Location` est généré côté serveur pour chaque sous-compte nécessaire.
- Après l'initialisation unique, l'admin utilise uniquement « Rafraîchir les sous-comptes ».
- Variables requises : `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`. Variable optionnelle : `GHL_REDIRECT_URI`.
