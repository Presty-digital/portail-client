# Portail Client Presty — V8 CRM

## Objectif
La V8 transforme l’espace client en véritable CRM simple à utiliser au quotidien, tout en conservant la base Supabase `app_state` et les données existantes.

## Espace client
Navigation :
- Tableau de bord
- Contacts
- CRM
- Calendrier
- Publicité
- Statistiques
- Paramètres

### CRM
- Vue Pipeline + vue Liste.
- Filtres : période, mois précis, catégorie, statut, source, recherche.
- Liste éditable directement comme un tableur : catégorie, statut, prochaine action, RDV, valeur et commentaire.
- Fiche contact en panneau latéral sans quitter le CRM.
- Commentaires horodatés avec historique.
- Activités commerciales et prochaine action.
- Rendez-vous avec date/heure, visibles automatiquement dans le Calendrier.

### Contacts
Base centrale de tous les prospects et clients. La gestion commerciale quotidienne reste dans le CRM.

### Calendrier
Les rendez-vous fixés dans le CRM apparaissent automatiquement dans la vue mensuelle.

### Paramètres
Les catégories CRM sont personnalisables pour que l’application puisse servir à tous les secteurs, pas seulement à l’esthétique.

## GoHighLevel
Deux routes sont disponibles :
- `/api/webhook/ghl` : route recommandée. Le portail identifie le client grâce au `locationId` du sous-compte GHL.
- `/api/webhook/ghl/[institutId]` : route historique conservée pour compatibilité.

Dans l’espace agence > Clients, Presty peut associer :
- un `Location ID` GHL à un client ;
- des `Form ID` à une catégorie et un service.

Le payload GHL peut notamment contenir `locationId`, `formId`, `contactId`, prénom, nom, téléphone, email, source et campagne. Le contact est alors créé/mis à jour dans le bon CRM.

Le webhook nécessite le header :
`x-webhook-secret: <GHL_WEBHOOK_SECRET>`

## Migration
La V8 utilise `CURRENT_VERSION = 10`. La migration est non destructive : les contacts, utilisateurs, dépenses, avis et intégrations existants sont conservés. Les anciens statuts sont normalisés vers le nouveau pipeline.

## Charte
Palette Presty : `#1D1E22`, `#2D45F9`, `#FDFDFD`, `#DAE7FF`, `#F2F4F9`.
