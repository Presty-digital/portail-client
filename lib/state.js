export const STATE_ID = 'presty-global';
export const CURRENT_VERSION = 3;
export const CATEGORIES = ['Minceur', 'Visage', 'Épilation', 'Autres'];

export function emptyState() {
  return { version: CURRENT_VERSION, instituts: [], leads: [], expenses: [], campaigns: [], reviews: [] };
}

const arr = (v) => Array.isArray(v) ? v : [];
export function migrate(raw) {
  const base = emptyState();
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    ...base,
    ...source,
    version: CURRENT_VERSION,
    instituts: arr(source.instituts).map((x) => ({ active: true, ville: '', contactName: '', ...x })),
    campaigns: arr(source.campaigns).map((x) => ({ active: true, category: 'Autres', ...x })),
    leads: arr(source.leads).map((x) => ({ status: 'Non qualifié', converted: false, value: 0, present: null, ...x })),
    expenses: arr(source.expenses),
    reviews: arr(source.reviews)
  };
}

export function publicStateForUser(state, user) {
  const role = user?.user_metadata?.role;
  if (role === 'agency_admin') return state;
  const institutId = user?.user_metadata?.institutId;
  return {
    ...state,
    instituts: state.instituts.filter((x) => x.id === institutId),
    campaigns: state.campaigns.filter((x) => x.institutId === institutId),
    leads: state.leads.filter((x) => x.institutId === institutId),
    expenses: state.expenses.filter((x) => x.institutId === institutId),
    reviews: state.reviews.filter((x) => x.institutId === institutId)
  };
}
