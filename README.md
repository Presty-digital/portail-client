## V9.1 — Correctif TypeScript

Correction des types de migration dans `lib/state.ts` afin de conserver la compatibilité avec les anciennes données sans bloquer le build TypeScript.

# Portail Presty — V9

V9 transforme le portail en CRM multi-comptes avec trois rôles : **Admin Presty**, **Client** et **Setter téléphonique**.

## Évolutions principales

- CRM : la vue **Liste est désormais la vue par défaut** ; Pipeline reste disponible.
- Filtres CRM : recherche, période, mois, catégorie, statut et formulaire.
- Statuts commerciaux par défaut : `Nouveau lead → Appel 1 → Appel 2 → En échange → RDV fixé → RDV réalisé → Gagné / Perdu`.
- Pastilles de couleur pour repérer immédiatement le statut.
- Colonne commentaire en lecture seule dans la liste : l'ajout se fait dans la fiche contact afin de conserver un historique horodaté.
- Actions rapides : Appeler, WhatsApp et SMS.
- Fiche contact latérale : coordonnées, suivi, rendez-vous, réponses du formulaire, commentaires et historique.
- `Calendrier` devient **Rendez-vous** avec une vue agenda/listing par jour (Aujourd'hui, Demain, 7 jours, À venir, Passés, date précise).
- Paramètres client avec sous-onglets : Compte, Utilisateur, CRM, Intégrations et Notifications.
- Le nom de l'espace client est basé sur le **nom de l'entreprise**, distinct du nom de l'utilisateur.
- Déconnexion visible en bas de la navigation.

## Multi-comptes et rôles

### Admin Presty
- voit tous les comptes ;
- crée les comptes clients et les utilisateurs ;
- peut entrer dans n'importe quel espace client via le sélecteur de profil ;
- configure le routage GHL des comptes.

### Client
- ne voit que son entreprise ;
- dispose de Tableau de bord, Contacts, CRM, Rendez-vous, Publicité, Statistiques et Paramètres.

### Setter téléphonique
- l'Admin choisit les comptes auxquels le setter a accès ;
- le setter peut switcher uniquement entre ces comptes ;
- accès limité à Tableau de bord, Contacts, CRM et Rendez-vous ;
- aucun accès aux Paramètres / Intégrations.

Les permissions sont filtrées **côté serveur**, pas seulement dans l'interface.

## GoHighLevel

Webhook générique recommandé :

`POST /api/webhook/ghl`

Header :

`x-webhook-secret: <GHL_WEBHOOK_SECRET>`

Le portail peut router le lead grâce au `locationId`, puis associer le `formId` au nom du formulaire et à une catégorie. Les réponses supplémentaires reçues du formulaire sont conservées dans `additionalInfo` et affichées dans le bloc **Informations complémentaires** de la fiche contact.

Champs reconnus notamment : `locationId`, `formId`, `formName`, `contactId`, prénom, nom, téléphone, email, campagne, source et données personnalisées.

## Base de données

La V9 conserve la même table Supabase `app_state`. La migration `CURRENT_VERSION = 11` enrichit les objets JSON existants sans réinitialiser la base.

Aucun nouveau script SQL n'est requis si `public.app_state` existe déjà.

## Variables Vercel

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_SESSION_SECRET`
- `GHL_WEBHOOK_SECRET`

## Déploiement

Uploader le contenu de cette archive sur le même repository GitHub. Vercel redéploie automatiquement. La base Supabase existante n'est pas écrasée.
