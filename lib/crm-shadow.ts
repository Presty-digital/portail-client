import { config, headers } from "./config";

const jsonHeaders = (extra: Record<string,string> = {}) => headers({
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
  ...extra,
});

export function stable(value: unknown) {
  try { return JSON.stringify(value ?? null); } catch { return ""; }
}

export function categoriesForLead(lead: any) {
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
    updatedAt: track.updatedAt || lead?.updatedAt || "",
    sourceTrack: track,
  };
}

function identity(lead: any) {
  return {
    nom: lead?.nom || "",
    prenom: lead?.prenom || "",
    email: lead?.email || "",
    telephone: lead?.telephone || "",
    institutId: lead?.institutId || "",
  };
}

export function appointmentRows(lead: any) {
  return categoriesForLead(lead).map((category) => {
    const track = trackingForCategory(lead, category);
    const at = String(track.rdvAt || "").trim();
    if (!at) return null;
    return {
      id: `current:${lead.id}:${category}`,
      contact_id: lead.id,
      data: {
        ...identity(lead), category, rdvAt: at, rdvDuration: track.rdvDuration,
        rdvType: track.rdvType, statut: track.status, updatedAt: track.updatedAt,
        // Preserve the complete category-scoped commercial object as well as normalized fields.
        sourceTrack: track.sourceTrack,
      },
      updated_at: new Date().toISOString(),
    };
  }).filter(Boolean);
}

export function actionRows(lead: any) {
  return categoriesForLead(lead).map((category) => {
    const track = trackingForCategory(lead, category);
    const at = String(track.nextActionAt || "").trim();
    const type = String(track.nextActionType || "").trim();
    if (!at && !type) return null;
    return {
      id: `current:${lead.id}:${category}`,
      contact_id: lead.id,
      data: {
        ...identity(lead), category, nextActionAt: at, nextActionType: type,
        statut: track.status, updatedAt: track.updatedAt,
        sourceTrack: track.sourceTrack,
      },
      updated_at: new Date().toISOString(),
    };
  }).filter(Boolean);
}

async function upsert(table: string, rows: any[]) {
  if (!rows.length) return;
  const { url } = config();
  const response = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
    method: "POST", headers: jsonHeaders(), body: JSON.stringify(rows), cache: "no-store",
  });
  if (!response.ok) throw new Error(`${table}: ${await response.text()}`);
}

async function removeForContacts(table: string, ids: string[]) {
  if (!ids.length) return;
  const { url } = config();
  const chunkSize = 75;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize).map((id) => `"${String(id).replace(/"/g, "")}"`).join(",");
    const response = await fetch(`${url}/rest/v1/${table}?contact_id=in.(${encodeURIComponent(chunk)})`, {
      method: "DELETE", headers: headers({ Prefer: "return=minimal" }), cache: "no-store",
    });
    if (!response.ok) throw new Error(`${table} delete: ${await response.text()}`);
  }
}

// app_state remains authoritative until the integrity audit proves a lossless copy.
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
