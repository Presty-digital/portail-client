import { config, headers } from "./config";

const jsonHeaders = (extra: Record<string,string> = {}) => headers({
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
  ...extra,
});

function stable(value: unknown) {
  try { return JSON.stringify(value ?? null); } catch { return ""; }
}

function appointmentRow(lead: any) {
  const at = String(lead?.rdvAt || "").trim();
  if (!at) return null;
  return {
    id: `current:${lead.id}`,
    contact_id: lead.id,
    data: {
      rdvAt: at,
      rdvDuration: Number(lead?.rdvDuration || 60),
      rdvType: lead?.rdvType || "",
      statut: lead?.statut || "",
      institutId: lead?.institutId || "",
      updatedAt: lead?.updatedAt || new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
}

function actionRow(lead: any) {
  const at = String(lead?.nextActionAt || "").trim();
  const type = String(lead?.nextActionType || "").trim();
  if (!at && !type) return null;
  return {
    id: `current:${lead.id}`,
    contact_id: lead.id,
    data: {
      nextActionAt: at,
      nextActionType: type,
      statut: lead?.statut || "",
      institutId: lead?.institutId || "",
      updatedAt: lead?.updatedAt || new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
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

async function removeCurrent(table: string, ids: string[]) {
  if (!ids.length) return;
  const { url } = config();
  for (const id of ids) {
    const response = await fetch(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(`current:${id}`)}`, {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`${table} delete: ${await response.text()}`);
  }
}

// V21.37 phase 1: shadow copy only. app_state remains the production source of truth.
// A shadow failure must never make a CRM save fail.
export async function mirrorChangedLeads(previousState: any, nextState: any) {
  const before = new Map((previousState?.leads || []).map((lead: any) => [lead.id, lead]));
  const changed = (nextState?.leads || []).filter((lead: any) => stable(before.get(lead.id)) !== stable(lead));
  if (!changed.length) return { mirrored: 0 };

  const now = new Date().toISOString();
  await upsert("crm_contacts", changed.map((lead: any) => ({
    id: lead.id,
    data: lead,
    updated_at: now,
  })));

  const appointments = changed.map(appointmentRow).filter(Boolean);
  const actions = changed.map(actionRow).filter(Boolean);
  await upsert("crm_appointments", appointments as any[]);
  await upsert("crm_actions", actions as any[]);

  const noAppointment = changed.filter((lead: any) => !appointmentRow(lead)).map((lead: any) => lead.id);
  const noAction = changed.filter((lead: any) => !actionRow(lead)).map((lead: any) => lead.id);
  await removeCurrent("crm_appointments", noAppointment);
  await removeCurrent("crm_actions", noAction);
  return { mirrored: changed.length };
}

export async function backfillLeadBatch(leads: any[]) {
  const now = new Date().toISOString();
  await upsert("crm_contacts", leads.map((lead: any) => ({ id: lead.id, data: lead, updated_at: now })));
  await upsert("crm_appointments", leads.map(appointmentRow).filter(Boolean) as any[]);
  await upsert("crm_actions", leads.map(actionRow).filter(Boolean) as any[]);
  return { mirrored: leads.length };
}
