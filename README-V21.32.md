# PRESTY CRM V21.32 — GHL Production Safe Audit

- Restores known GHL sub-account names from historical client assignments instead of displaying IDs twice.
- Never overwrites a human location name with its location ID.
- Manual installed-location discovery never consumes the Company refresh token.
- On 401/403, returns a non-secret diagnostic (userType / oauth.readonly / companyId presence) while preserving production tokens.
- Keeps current HighLevel v3 `/oauth/installed-locations` pagination.
- No CRM pipeline, lead webhook, client assignment, or Supabase schema change.
