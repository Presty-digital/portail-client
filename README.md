# Portail Client Presty — V8 UX & Sécurité

## V8
- Refonte UI complète basée sur la charte graphique Presty.
- Palette : #1D1E22, #2D45F9, #FDFDFD, #DAE7FF, #F2F4F9.
- Urbanist pour les textes ; Apfel Grotezk déclarée pour les titres avec fallback Urbanist si la webfont n'est pas disponible.
- Logo Presty extrait de la charte fournie, sans recoloration rose.
- Ombres douces et glassmorphism conformes à la direction artistique.
- Nouvelle page de connexion responsive.
- « Mot de passe oublié ? » avec email de récupération Supabase.
- Page `/reset-password` pour choisir un nouveau mot de passe.
- Modification du mot de passe depuis « Mon compte » une fois connecté.
- Les nouveaux comptes admin/institut sont également provisionnés dans Supabase Auth pour permettre la récupération par email.
- Les comptes historiques sont provisionnés automatiquement dans Supabase Auth lors de la première demande « Mot de passe oublié ».

## Important — récupération par email
Dans Supabase > Authentication > URL Configuration, ajouter l'URL de production du portail dans les Redirect URLs, par exemple :
`https://votre-portail.vercel.app/reset-password`

## Base de données
La V8 conserve la table `public.app_state` et la ligne `presty-main`. La migration incrémente uniquement la version de l'état et ne supprime aucune donnée métier.
