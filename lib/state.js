export const VERSION = 4;
export const CATEGORIES = ["Minceur","Visage","Épilation","Autres"];
export const STATUTS = ["Non qualifié","Appel 1","Appel 2","RDV fixé","Client converti","Perdu"];
export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
export const today = () => new Date().toISOString().slice(0,10);
export const emptyState = () => ({version:VERSION,instituts:[],leads:[],campaigns:[],spend:[],reviews:[],settings:{brand:"Presty",categories:CATEGORIES}});
const normalizeInstitut=i=>({id:i.id||uid(),name:i.name||"Institut",ville:i.ville||"",contactName:i.contactName||"",email:i.email||"",active:i.active!==false,createdAt:i.createdAt||today()});
const normalizeCampaign=c=>({id:c.id||uid(),institutId:c.institutId||"",category:CATEGORIES.includes(c.category)?c.category:"Autres",name:c.name||"Campagne",active:c.active!==false});
const normalizeLead=l=>({id:l.id||uid(),institutId:l.institutId||"",dateContact:l.dateContact||today(),prenom:l.prenom||"",nom:l.nom||"",telephone:l.telephone||"",email:l.email||"",source:l.source||"GHL",campaignId:l.campaignId||"",category:CATEGORIES.includes(l.category)?l.category:"Autres",typeSoin:l.typeSoin||"",problematique:l.problematique||"",statut:STATUTS.includes(l.statut)?l.statut:"Non qualifié",creneauRdv:l.creneauRdv||"",presence:l.presence||"À confirmer",converti:l.converti||"Non",valeurClient:Number(l.valeurClient||0),notes:l.notes||"",createdAt:l.createdAt||new Date().toISOString()});
const normalizeSpend=s=>({id:s.id||uid(),institutId:s.institutId||"",campaignId:s.campaignId||"",category:CATEGORIES.includes(s.category)?s.category:"Autres",year:Number(s.year||new Date().getFullYear()),month:Number(s.month||new Date().getMonth()+1),amount:Number(s.amount||0)});
export function migrate(raw){
  if(!raw||typeof raw!=="object"||Object.keys(raw).length===0)return emptyState();
  return {...emptyState(),...raw,version:VERSION,instituts:(raw.instituts||[]).map(normalizeInstitut),campaigns:(raw.campaigns||[]).map(normalizeCampaign),leads:(raw.leads||[]).map(normalizeLead),spend:(raw.spend||raw.depenses||[]).map(normalizeSpend),reviews:raw.reviews||raw.avis||[]};
}
export function scopedState(state,profile){
  if(profile.role==="agency_admin")return state;
  const id=profile.institut_id;
  return {...state,instituts:state.instituts.filter(x=>x.id===id),campaigns:state.campaigns.filter(x=>x.institutId===id),leads:state.leads.filter(x=>x.institutId===id),spend:state.spend.filter(x=>x.institutId===id),reviews:state.reviews.filter(x=>x.institutId===id)};
}
