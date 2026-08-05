import { apiError, loadState, requireUser, saveState } from '@/lib/server';
import { publicStateForUser } from '@/lib/state';

export async function GET(req) {
  try { const user = await requireUser(req); return Response.json({ state: publicStateForUser(await loadState(), user), role: user.user_metadata?.role, institutId: user.user_metadata?.institutId || null, name: user.user_metadata?.name || user.email }); }
  catch (e) { return apiError(e); }
}

export async function PUT(req) {
  try {
    const user = await requireUser(req); const incoming = await req.json(); const current = await loadState();
    if (user.user_metadata?.role === 'agency_admin') return Response.json({ state: await saveState(incoming.state) });
    const id = user.user_metadata?.institutId;
    const next = { ...current,
      leads: [...current.leads.filter(x=>x.institutId!==id), ...(incoming.state?.leads||[]).filter(x=>x.institutId===id)],
      reviews: [...current.reviews.filter(x=>x.institutId!==id), ...(incoming.state?.reviews||[]).filter(x=>x.institutId===id)]
    };
    return Response.json({ state: publicStateForUser(await saveState(next), user) });
  } catch (e) { return apiError(e); }
}
