export const CURRENT_VERSION=10;
export const STATE_ID="presty-main";
export const DEFAULT_CATEGORIES=["Minceur","Visage","Épilation","Autres"];
export const CATEGORIES=DEFAULT_CATEGORIES;
export const DEFAULT_PIPELINE=["Nouveau","À contacter","En échange","RDV fixé","RDV réalisé","Gagné","Perdu"];
export const STATUTS=DEFAULT_PIPELINE;
export const ACTION_TYPES=["Appel","SMS","WhatsApp","Email","RDV","Relance","Autre"];
export const SOURCES=["Meta Ads","Google Ads","Site web","GoHighLevel","Recommandation","Organique","Autre"];
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
export const today=()=>new Date().toISOString().slice(0,10);
export const nowIso=()=>new Date().toISOString();
export const emptyState=()=>({version:CURRENT_VERSION,initialized:false,users:[],instituts:[],campaigns:[],leads:[],expenses:[],reviews:[],integrations:[]});
const arr=v=>Array.isArray(v)?v:[];
const statusMap={"Non qualifié":"Nouveau","Appel 1":"À contacter","Appel 2":"À contacter","Client converti":"Gagné"};
export function normalizeLead(x={}){
 const status=statusMap[x.statut]||x.statut||"Nouveau";
 const comments=arr(x.comments).map(c=>typeof c==="string"?{id:uid(),text:c,createdAt:x.updatedAt||x.dateContact||nowIso(),author:"Utilisateur"}:c);
 return {...x,id:x.id||uid(),prenom:x.prenom||x.firstName||"",nom:x.nom||x.lastName||"",company:x.company||"",telephone:x.telephone||x.phone||"",email:x.email||"",statut:DEFAULT_PIPELINE.includes(status)?status:"Nouveau",category:x.category||"Autres",source:x.source||x.origine||"Autre",typeSoin:x.typeSoin||x.service||"",dateContact:x.dateContact||x.date||today(),converted:Boolean(x.converted||status==="Gagné"),value:Number(x.value||x.valeurClient||0),comments,activity:arr(x.activity),nextActionType:x.nextActionType||"",nextActionAt:x.nextActionAt||"",rdvAt:x.rdvAt||x.creneauRdv||"",rdvDuration:Number(x.rdvDuration||60),rdvType:x.rdvType||"",problematique:x.problematique||"",tags:arr(x.tags),ghlContactId:x.ghlContactId||"",ghlLocationId:x.ghlLocationId||"",ghlFormId:x.ghlFormId||"",ghlCampaignId:x.ghlCampaignId||"",updatedAt:x.updatedAt||nowIso()};
}
export function normalizeInstitut(i={}){return {...i,categories:arr(i.categories).length?arr(i.categories):DEFAULT_CATEGORIES,pipeline:arr(i.pipeline).length?arr(i.pipeline):DEFAULT_PIPELINE};}
export function migrate(raw){const b=emptyState();if(!raw||typeof raw!=="object")return b;const out={...b,...raw,version:CURRENT_VERSION};out.users=arr(raw.users);out.instituts=arr(raw.instituts).map(normalizeInstitut);out.campaigns=arr(raw.campaigns);out.leads=arr(raw.leads).map(normalizeLead);out.expenses=arr(raw.expenses||raw.spend);out.reviews=arr(raw.reviews);out.integrations=arr(raw.integrations);out.initialized=Boolean(raw.initialized||out.users.some(x=>x.role==="agency_admin"));return out;}
export const getClientCategories=(state,iid)=>state.instituts.find(i=>i.id===iid)?.categories||DEFAULT_CATEGORIES;
export const getClientPipeline=(state,iid)=>state.instituts.find(i=>i.id===iid)?.pipeline||DEFAULT_PIPELINE;
