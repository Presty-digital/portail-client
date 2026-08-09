export const CURRENT_VERSION=12;
export const STATE_ID="presty-main";
export const DEFAULT_CATEGORIES=["Minceur","Visage","Épilation","Autres"];
export const CATEGORIES=DEFAULT_CATEGORIES;
export const DEFAULT_PIPELINE_CONFIG=[
 {id:"new",label:"Nouveau",color:"#7B8494",type:"prospect"},
 {id:"call1",label:"Appel 1",color:"#4B78D1",type:"contact"},
 {id:"call2",label:"Appel 2",color:"#5268D6",type:"contact"},
 {id:"exchange",label:"En échange",color:"#6858CC",type:"contact"},
 {id:"booked",label:"RDV fixé",color:"#2D7DBB",type:"appointment_booked"},
 {id:"done",label:"RDV réalisé",color:"#238D73",type:"appointment_completed"},
 {id:"noshow",label:"No-show",color:"#C17B2B",type:"no_show"},
 {id:"won",label:"Gagné",color:"#27834E",type:"won"},
 {id:"lost",label:"Perdu",color:"#B74848",type:"lost"}
];
export const DEFAULT_PIPELINE=DEFAULT_PIPELINE_CONFIG.map(x=>x.label);
export const STATUTS=DEFAULT_PIPELINE;
export const ACTION_TYPES=["Appel","SMS","WhatsApp","Email","RDV","Relance","Autre"];
export const CHANNELS=["Meta","Google","Site web","GoHighLevel","Recommandation","Organique","Manuel","Autre"];
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
export const today=()=>new Date().toISOString().slice(0,10);
export const nowIso=()=>new Date().toISOString();
export const emptyState=()=>({version:CURRENT_VERSION,initialized:false,users:[],instituts:[],campaigns:[],leads:[],expenses:[],reviews:[],integrations:[],notifications:[]});
const arr=(v:any):any[]=>Array.isArray(v)?v:[];
const statusMap:any={"Nouveau lead":"Nouveau","Nouveau":"Nouveau","Non qualifié":"Nouveau","À contacter":"Appel 1","Appel 1":"Appel 1","Appel 2":"Appel 2","En échange":"En échange","RDV fixé":"RDV fixé","RDV réalisé":"RDV réalisé","No-show":"No-show","Client converti":"Gagné","Gagné":"Gagné","Perdu":"Perdu"};
const defaultByLabel=(label:string)=>DEFAULT_PIPELINE_CONFIG.find(x=>x.label===label);
export function normalizeLead(x:any={}){const mapped=statusMap[x.statut]||x.statut||"Nouveau";const comments=arr(x.comments).map((c:any)=>typeof c==="string"?{id:uid(),text:c,createdAt:x.updatedAt||x.dateContact||nowIso(),author:"Utilisateur"}:c);return {...x,id:x.id||uid(),prenom:x.prenom||x.firstName||"",nom:x.nom||x.lastName||"",company:x.company||"",telephone:x.telephone||x.phone||"",email:x.email||"",statut:mapped,category:x.category||"Autres",channel:x.channel||x.source||x.origine||"Autre",source:x.source||x.formName||x.typeSoin||"",formName:x.formName||x.sourceLabel||x.typeSoin||"",typeSoin:x.typeSoin||x.service||"",dateContact:x.dateContact||x.date||today(),converted:Boolean(x.converted||mapped==="Gagné"),value:Number(x.value||x.valeurClient||0),comments,activity:arr(x.activity),nextActionType:x.nextActionType||"",nextActionAt:x.nextActionAt||"",rdvAt:x.rdvAt||x.creneauRdv||"",rdvDuration:Number(x.rdvDuration||60),rdvType:x.rdvType||"",problematique:x.problematique||"",additionalInfo:x.additionalInfo&&typeof x.additionalInfo==="object"?x.additionalInfo:{},tags:arr(x.tags),ghlContactId:x.ghlContactId||"",ghlLocationId:x.ghlLocationId||"",ghlFormId:x.ghlFormId||"",ghlCampaignId:x.ghlCampaignId||"",updatedAt:x.updatedAt||nowIso()};}
export function normalizeInstitut(i:any={}){const old=arr(i.pipeline);let config=arr(i.pipelineConfig).map((s:any,index:number)=>typeof s==="string"?{id:`stage-${index}`,label:s,color:defaultByLabel(statusMap[s]||s)?.color||"#67707E",type:defaultByLabel(statusMap[s]||s)?.type||"contact"}:{id:s.id||`stage-${index}`,label:statusMap[s.label]||s.label||`Étape ${index+1}`,color:s.color||"#67707E",type:s.type||"contact"});if(!config.length){config=(old.length?old:DEFAULT_PIPELINE).map((label:any,index:number)=>{const l=statusMap[label]||label;const d=defaultByLabel(l);return{id:`stage-${index}-${String(l).toLowerCase().replace(/\W/g,'')}`,label:l,color:d?.color||"#67707E",type:d?.type||"contact"}})}return {...i,id:i.id||uid(),name:i.name||i.companyName||"Compte client",companyName:i.companyName||i.name||"Compte client",categories:arr(i.categories).length?arr(i.categories):DEFAULT_CATEGORIES,pipelineConfig:config,pipeline:config.map((x:any)=>x.label),active:i.active!==false};}
export function normalizeUser(u:any={}){const role=u.role==="institut"?"client":u.role||"client";const accessIds=arr(u.accessIds).length?arr(u.accessIds):(u.institutId?[u.institutId]:[]);return {...u,role,accessIds,institutId:u.institutId||accessIds[0]||null,active:u.active!==false};}
export function migrate(raw:any){const b=emptyState();if(!raw||typeof raw!=="object")return b;const out:any={...b,...raw,version:CURRENT_VERSION};out.users=arr(raw.users).map(normalizeUser);out.instituts=arr(raw.instituts).map(normalizeInstitut);out.campaigns=arr(raw.campaigns);out.leads=arr(raw.leads).map(normalizeLead);out.expenses=arr(raw.expenses||raw.spend);out.reviews=arr(raw.reviews);out.integrations=arr(raw.integrations);out.notifications=arr(raw.notifications);out.initialized=Boolean(raw.initialized||out.users.some((x:any)=>x.role==="agency_admin"));return out;}
export const getClientCategories=(state:any,iid:string)=>state.instituts.find((i:any)=>i.id===iid)?.categories||DEFAULT_CATEGORIES;
export const getClientPipelineConfig=(state:any,iid:string)=>state.instituts.find((i:any)=>i.id===iid)?.pipelineConfig||DEFAULT_PIPELINE_CONFIG;
export const getClientPipeline=(state:any,iid:string)=>getClientPipelineConfig(state,iid).map((x:any)=>x.label);
