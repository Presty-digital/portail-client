import { adminSupabase } from './supabase';
import { STATE_ID, migrate } from './state';

export async function requireUser(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new Error('UNAUTHORIZED');
  const supabase = adminSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('UNAUTHORIZED');
  return data.user;
}

export async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.user_metadata?.role !== 'agency_admin') throw new Error('FORBIDDEN');
  return user;
}

export async function loadState() {
  const supabase = adminSupabase();
  const { data, error } = await supabase.from('app_state').select('payload').eq('id', STATE_ID).single();
  if (error) throw error;
  const state = migrate(data?.payload);
  if ((data?.payload?.version || 0) !== state.version) await saveState(state);
  return state;
}

export async function saveState(state) {
  const supabase = adminSupabase();
  const payload = migrate(state);
  const { error } = await supabase.from('app_state').upsert({ id: STATE_ID, payload, updated_at: new Date().toISOString() });
  if (error) throw error;
  return payload;
}

export function apiError(error) {
  const m = error?.message || String(error);
  if (m === 'UNAUTHORIZED') return Response.json({ error: 'Non authentifié' }, { status: 401 });
  if (m === 'FORBIDDEN') return Response.json({ error: 'Accès refusé' }, { status: 403 });
  return Response.json({ error: m }, { status: 500 });
}
