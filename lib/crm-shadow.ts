import { config, headers } from "./config";

const jsonHeaders = (extra: Record<string,string> = {}) => headers({
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
  ...extra,
});

function stable(value: unknown) {
  try { return JSON.stringify(value ?? null); } catch { return ""; }
}

function categoriesForLead(lead: any) {
  const values = [
    ...(Array.isArray(lead?.categories) ? lead.categories : []),
    ...Object.keys(lead?.commercialByCategory || {}),
    lead?.latestCategory,
    lead?.category,
  ].map((value) => String(value || "").trim()).filter(Boolean);
  return [...new Set(values)];
}

function trackingForCategory(lead: any, category: string) {
  const track = lead?.commercialByCategory?.[category] || {};
  const isLegacy = category === String(lead?.latestCategory || lead?.category || "").trim();
  return {
    category,
    status: track.status || track.statut || (isLegacy ? lead?.statut : "") || "",
    rdvAt: track.rdvAt ?? (isLegacy ? lead?.rdvAt : "") ?? "",
    rdvDuration: Number(track.rdvDuration || lead?.rdvDuration || 60),
    rdvType: track.rdvType ?? (isLegacy ? lead?.rdvType : "") ?? "",
    nextActionAt: track.nextActionAt ?? (isLegacy ? lead?.nextActionAt : "") ?? "",
    nextActionType: track.nextActionType ?? (isLegacy ? lead?.nextActionType : "") ?? "",
    comments: Array.isArray(track.comments) ? track.comments : (isLegacy && Array.isArray(lead?.comments) ? lead.comments : []),
    updatedAt: track.updatedAt || lead?.updatedAt || new Date().toISOString(),
  };
}

function appointmentRows(lead: any) {
  return categoriesForLead(lead).map((category) => {
    const track = trackingForCategory(lead, category);
    const at = String(track.rdvAt || "").trim();
    if (!at) return null;
    return {
      id: `current:${lead.id}:${category}`,
      contact_id: lead.id,
      data: {
        category,
        rdvAt: at,
        rdvDuration: track.rdvDuration,
        rdvType: track.rdvType,
        statut: track.status,
        institutId: lead?.institutId || "",
        updatedAt: track.updatedAt,
      },
      updated_at: new Date().toISOString(),
    };
  }).filter(Boolean);
}

function actionRows(lead: any) {
  return categoriesForLead(lead).map((category) => {
    const track = trackingForCategory(lead, category);
    const at = String(track.nextActionAt || "").trim();
    const type = String(track.nextActionType || "").trim();
    if (!at && !type) return null;
    return {
      id: `current:${lead.id}:${category}`,
      contact_id: lead.id,
      data: {
        category,
        nextActionAt: at,
        nextActionType: type,
        statut: track.status,
        institutId: lead?.institutId || "",
        updatedAt: track.updatedAt,
      },
      updated_at: new Date().toISOString(),
    };
  }).filter(Boolean);
}

async function upsert(table: string, rows: any[]) {
  if (!rows.length) return;
  const { url } = config();
  const response = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${table}: ${await response.text()}`);
}

async function removeForContacts(table: string, ids: string[]) {
  if (!ids.length) return;
  const { url } = config();
  for (const id of ids) {
    const response = await fetch(`${url}/rest/v1/${table}?contact_id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`${table} delete: ${await response.text()}`);
  }
}

// Shadow copy only. app_state remains the production source of truth.
// Commercial state is category-scoped in the CRM UI, so appointments/actions must
// be projected from commercialByCategory rather than only from legacy root fields.
// A shadow failure must never make a CRM save fail.
export async function mirrorChangedLeads(previousState: any, nextState: any) {
  const before = new Map((previousState?.leads || []).map((lead: any) => [lead.id, lead]));
  const changed = (nextState?.leads || []).filter((lead: any) => stable(before.get(lead.id)) !== stable(lead));
  if (!changed.length) return { mirrored: 0 };

  const now = new Date().toISOString();
  await upsert("crm_contacts", changed.map((lead: any) => ({ id: lead.id, data: lead, updated_at: now })));

  const ids = changed.map((lead: any) => lead.id);
  await removeForContacts("crm_appointments", ids);
  await removeForContacts("crm_actions", ids);
  await upsert("crm_appointments", changed.flatMap(appointmentRows) as any[]);
  await upsert("crm_actions", changed.flatMap(actionRows) as any[]);
  return { mirrored: changed.length };
}

export async function backfillLeadBatch(leads: any[]) {
  const now = new Date().toISOString();
  const ids = leads.map((lead: any) => lead.id);
  await upsert("crm_contacts", leads.map((lead: any) => ({ id: lead.id, data: lead, updated_at: now })));
  await removeForContacts("crm_appointments", ids);
  await removeForContacts("crm_actions", ids);
  await upsert("crm_appointments", leads.flatMap(appointmentRows) as any[]);
  await upsert("crm_actions", leads.flatMap(actionRows) as any[]);
  return { mirrored: leads.length };
}
