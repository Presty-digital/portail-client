# Portail Client Presty — V2

## Nouveautés V2
- Branding Presty : Urbanist, rose `#DB6C7A`, crème `#F7F1E8`, noir `#201B1B`.
- Nomenclature `instituts` / rôle `institut`.
- Catégories fixes : Minceur, Visage, Épilation, Autres.
- Soins et campagnes propres à chaque institut.
- Dépenses publicitaires saisies mensuellement par Presty, par soin/campagne.
- Dashboard calculé en direct depuis le CRM et les dépenses.
- Résultats globaux, par catégorie et par soin/campagne.
- CRM avec vue Kanban et vue Liste.
- Module Avis Google en lecture côté institut.
- Webhook GHL rattachant un lead à un soin lorsque `campagne_soin_id` ou `type_soin` est transmis.

## Installation
```bash
npm install
npm run build
npm run dev
```

## Supabase
Pour un nouveau projet, exécuter `supabase/schema.sql` dans SQL Editor.

Cette V2 modifie fortement le schéma de la V1 (`clients` devient `instituts`, `client` devient `institut`). Sur une base V1 déjà remplie, ne pas exécuter ce script sans migration des données.

## Variables exactes
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GHL_WEBHOOK_SECRET`

## Webhook GHL
`POST /api/webhook/ghl/<INSTITUT_UUID>` avec le header `x-webhook-secret`.

Champs recommandés : `first_name`, `last_name`, `phone`, `email`, `source`, `problematique`, `campagne_soin_id`. À défaut, `type_soin` est rapproché du nom d’une campagne existante.
