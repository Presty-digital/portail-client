# Presty CRM V20.10 — diagnostic GHL

Version temporaire de diagnostic. Aucun changement visuel.

- Enregistre les 10 derniers événements ContactCreate / ContactUpdate reçus.
- Enregistre les soumissions `/forms/submissions` et leur objet `others` brut.
- Enregistre les `customFields` du webhook ContactCreate.
- Teste l'endpoint Custom Fields GHL avec les versions `2023-02-21` et `2021-07-28` et conserve le statut/résultat.
- Diagnostic accessible uniquement à l'administrateur connecté sur `/api/ghl/diagnostics`.
