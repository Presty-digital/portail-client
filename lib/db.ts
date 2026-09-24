import { config, headers } from "./config";
import { STATE_ID, emptyState, migrate } from "./state";
import { mirrorChangedLeads } from "./crm-shadow";

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
  let previous: any = null;
  if (!options.allowGhlOAuthWrite) {
    try {
      const currentResponse = await fetch(
        `${url}/rest/v1/app_state?id=eq.${STATE_ID}&select=payload`,
        { headers: headers(), cache: "no-store" }
      );
      if (currentResponse.ok) {
        const rows = await currentResponse.json();
        const current: any = migrate(rows?.[0]?.payload || emptyState());
        previous = current;
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

  // Shadow write is deliberately non-blocking: app_state remains authoritative in V21.37.
  if (previous) {
    try { await mirrorChangedLeads(previous, payload); } catch (error) {
      console.error("[crm-shadow] mirror failed", error);
    }
  }
}

// V21.44 — Lecture versionnée : renvoie l'état, une copie indépendante pour le miroir,
// et la valeur exacte de updated_at qui sert de jeton de version (CAS).
export async function loadStateVersioned() {
  const { url } = config();
  const response = await fetch(
    `${url}/rest/v1/app_state?id=eq.${STATE_ID}&select=payload,updated_at`,
    { headers: headers(), cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Supabase: ${await response.text()}`);
  const rows = await response.json();
  const raw = rows?.[0]?.payload || emptyState();
  return {
    state: migrate(raw),
    previous: migrate(JSON.parse(JSON.stringify(raw))),
    updatedAt: (rows?.[0]?.updated_at ?? null) as string | null,
  };
}

// V21.44 — Écriture conditionnelle (compare-and-swap sur updated_at).
// N'écrit QUE si app_state n'a pas été modifié depuis loadStateVersioned().
// Renvoie false en cas de conflit : l'appelant doit relire et réappliquer sa mutation.
// L'état écrit provient d'une lecture fraîche validée par le CAS : ghlOAuth y est donc
// à jour, aucune protection supplémentaire n'est nécessaire.
export async function saveStateIfUnchanged(state: unknown, expectedUpdatedAt: string | null, previous: any = null) {
  const { url } = config();
  const payload: any = migrate(state);
  const expectedMs = expectedUpdatedAt ? Date.parse(expectedUpdatedAt) : NaN;
  // Le nouveau updated_at est toujours strictement postérieur à l'ancien.
  const nextUpdatedAt = new Date(Math.max(Date.now(), Number.isFinite(expectedMs) ? expectedMs + 1 : 0)).toISOString();
  const versionFilter = expectedUpdatedAt
    ? `updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`
    : `updated_at=is.null`;
  const response = await fetch(`${url}/rest/v1/app_state?id=eq.${STATE_ID}&${versionFilter}&select=id`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify({ payload, updated_at: nextUpdatedAt }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase: ${await response.text()}`);
  const rows = await response.json().catch(() => []);
  if (!Array.isArray(rows) || rows.length === 0) return false;
  if (previous) {
    try { await mirrorChangedLeads(previous, payload); } catch (error) {
      console.error("[crm-shadow] mirror failed", error);
    }
  }
  return true;
}
