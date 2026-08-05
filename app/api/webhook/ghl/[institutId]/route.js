import { randomUUID } from 'crypto';
import { apiError, loadState, saveState } from '@/lib/server';
export async function POST(req, { params }) {
  try {
    if ((req.headers.get('x-webhook-secret') || '') !== process.env.GHL_WEBHOOK_SECRET) return new Response('Unauthorized', {status:401});
    const { institutId } = await params; const body = await req.json(); const state = await loadState(); const now = new Date();
    state.leads.unshift({ id: randomUUID(), institutId, campaignId: body.campaign_id || '', firstName: body.first_name || '', lastName: body.last_name || '', phone: body.phone || '', email: body.email || '', source: body.source || 'GHL', problem: body.custom_field_probleme || '', status: 'Non qualifié', present: null, converted: false, value: 0, notes: '', year: now.getFullYear(), month: now.getMonth()+1, createdAt: now.toISOString() });
    await saveState(state); return new Response('OK');
  } catch(e){ return apiError(e); }
}
