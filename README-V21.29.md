# PRESTY CRM V21.29 — GHL OAuth Scope Fix

- Fusionne toujours les scopes OAuth indispensables (`oauth.readonly`, `oauth.write`) avec `GHL_SCOPES`, même si Vercel contient encore une ancienne liste.
- Vérifie les scopes réellement présents dans le Company token avant `installed-locations`.
- Message explicite si le token délivré ne contient pas `oauth.readonly`.
- Corrige le mapping du nom des installations v3 (`name`).
- Conserve la pagination v3, le Safe Sync V21.28 et le reste du CRM.
