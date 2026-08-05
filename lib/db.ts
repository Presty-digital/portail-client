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

export async function saveState(state: unknown) {
  const { url } = config();
  const response = await fetch(`${url}/rest/v1/app_state?on_conflict=id`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({
      id: STATE_ID,
      payload: migrate(state),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Supabase: ${await response.text()}`);
}
