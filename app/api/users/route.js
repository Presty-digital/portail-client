import { adminSupabase } from '@/lib/supabase';
import { apiError, requireAdmin } from '@/lib/server';
export async function PATCH(req) {
  try { await requireAdmin(req); const { userId, password, active } = await req.json(); const attrs = {}; if (password) attrs.password=password; if (typeof active==='boolean') attrs.ban_duration = active ? 'none' : '876000h'; const { error } = await adminSupabase().auth.admin.updateUserById(userId, attrs); if(error) throw error; return Response.json({ok:true}); }
  catch(e){ return apiError(e); }
}
