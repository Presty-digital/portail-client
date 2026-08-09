# Portail Presty — V12

## Évolutions V12

- Statistiques avec les mêmes filtres de période que le tableau de bord : Maximum, aujourd’hui, hier, 7 jours, 30 jours, ce mois, mois dernier et période personnalisée.
- Les KPI et les ventilations par formulaire/catégorie se recalculent selon la période.
- Bouton **Ajouter un contact** directement dans Contacts.
- Refonte responsive tablette/mobile : menu latéral mobile, topbar compacte, tableaux transformés en cartes, filtres empilés, panneaux et formulaires adaptés, rendez-vous et paramètres optimisés.
- Champs de formulaire en 16px sur mobile pour éviter le zoom automatique iPhone.
- Aucun changement SQL : migration de données non destructive, même table `app_state`.

## Déploiement

Décompresser puis uploader tout le contenu sur le même repository GitHub. Vercel redéploiera automatiquement.
