# PRESTY CRM V21.25 — GHL OAuth rotation fix

- Pagination HighLevel v3: pageSize=100 + nextPageToken.
- OAuth token exchange uses standard snake_case fields.
- HighLevel refresh tokens are treated as single-use.
- Location tokens are regenerated from the Company token instead of consuming Location refresh tokens.
- Reconnect preserves existing sub-account assignments and does not auto-sync inside the OAuth callback.
- After reconnect, run one manual “Rafraîchir les sous-comptes”.
