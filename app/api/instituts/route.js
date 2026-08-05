import { randomUUID } from 'crypto';
import { adminSupabase } from '@/lib/supabase';
import { apiError, loadState, requireAdmin, saveState } from '@/lib/server';

export async function POST(req) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    if (!body.name || !body.email || !body.password) return Response.json({ error: 'Nom, email et mot de passe requis.' }, { status: 400 });
    const institutId = randomUUID();
    const supabase = adminSupabase();
    const { data, error } = await supabase.auth.admin.createUser({ email: body.email, password: body.password, email_confirm: true, user_metadata: { role: 'institut', institutId, name: body.contactName || body.name } });
    if (error) throw error;
    const state = await loadState();
    state.instituts.push({ id: institutId, authUserId: data.user.id, name: body.name, ville: body.ville || '', contactName: body.contactName || '', email: body.email, active: true, createdAt: new Date().toISOString() });
    await saveState(state);
    return Response.json({ ok: true, institutId });
  } catch(e) { return apiError(e); }
}
