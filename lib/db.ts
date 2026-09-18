import { config, headers } from "./config";
import { STATE_ID, emptyState, migrate } from "./state";

export async function loadState() {
  const { url } = config();
  const response = await fetch(
    `${url}/rest/v1/app_state?id=eq.${STATE_ID}&select=payload`,
    { headers: headers(), cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Supabase: ${await response.text()}`);
  const rows = await response.json();
  return migrate(rows?.[0]?.payload || emptyState());
}

export async function saveState(state: unknown, options: { allowGhlOAuthWrite?: boolean } = {}) {
  const { url } = config();
  // V21.30: ghlOAuth contient des secrets OAuth rotatifs. Les écritures CRM ordinaires
  // (leads, webhooks, UI, utilisateurs...) ne doivent JAMAIS pouvoir réécrire une
  // ancienne copie du token agence chargée quelques millisecondes auparavant.
  // Seul le flux OAuth explicite passe allowGhlOAuthWrite=true.
  let payload: any = migrate(state);
  if (!options.allowGhlOAuthWrite) {
    try {
      const currentResponse = await fetch(
        `${url}/rest/v1/app_state?id=eq.${STATE_ID}&select=payload`,
        { headers: headers(), cache: "no-store" }
      );
      if (currentResponse.ok) {
        const rows = await currentResponse.json();
        const current: any = migrate(rows?.[0]?.payload || emptyState());
        payload = { ...payload, ghlOAuth: current.ghlOAuth };
      }
    } catch {}
  }
  const response = await fetch(`${url}/rest/v1/app_state?on_conflict=id`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({
      id: STATE_ID,
      payload,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Supabase: ${await response.text()}`);
}
