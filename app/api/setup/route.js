import { adminSupabase } from '@/lib/supabase';
import { apiError } from '@/lib/server';

export async function GET() {
  try {
    const supabase = adminSupabase();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    return Response.json({ initialized: data.users.some(u => u.user_metadata?.role === 'agency_admin') });
  } catch (e) { return apiError(e); }
}

export async function POST(req) {
  try {
    const supabase = adminSupabase();
    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    if (listed.users.some(u => u.user_metadata?.role === 'agency_admin')) return Response.json({ error: 'Administrateur déjà créé' }, { status: 409 });
    const { name, email, password } = await req.json();
    if (!email || !password || password.length < 8) return Response.json({ error: 'Email et mot de passe de 8 caractères minimum requis.' }, { status: 400 });
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'agency_admin', name: name || 'Administrateur Presty' } });
    if (error) throw error;
    return Response.json({ ok: true, userId: data.user.id });
  } catch (e) { return apiError(e); }
}
