export function periodRows(state, institutId, year, month, category = 'Toutes') {
  const campaigns = state.campaigns.filter(c => c.institutId === institutId);
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));
  const inCategory = (campaignId) => category === 'Toutes' || campaignMap[campaignId]?.category === category;
  const leads = state.leads.filter(l => l.institutId === institutId && Number(l.year) === year && Number(l.month) === month && inCategory(l.campaignId));
  const expenses = state.expenses.filter(e => e.institutId === institutId && Number(e.year) === year && Number(e.month) === month && inCategory(e.campaignId));
  const spend = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const ca = leads.filter(l=>l.converted).reduce((s,l)=>s+Number(l.value||0),0);
  const rdv = leads.filter(l=>['RDV fixé','Client converti'].includes(l.status)).length;
  const present = leads.filter(l=>l.present === true).length;
  const clients = leads.filter(l=>l.converted).length;
  return { leads: leads.length, rdv, present, clients, spend, ca,
    cpl: leads.length ? spend/leads.length : 0,
    cac: clients ? spend/clients : 0,
    conversion: leads.length ? clients/leads.length*100 : 0,
    attendance: rdv ? present/rdv*100 : 0,
    roi: spend ? ca/spend : 0 };
}
