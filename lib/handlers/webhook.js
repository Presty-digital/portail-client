import {NextResponse} from "next/server";
import crypto from "node:crypto";
import {loadState,saveState} from "@/lib/db";
import {uid,today,nowIso,normalizeLead} from "@/lib/state";
import {getValidLocationToken,exchangeLocationToken} from "@/lib/ghl-oauth";

const GHL_ED25519_PUBLIC_KEY=`-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=
-----END PUBLIC KEY-----`;
const FORMS_API="https://services.leadconnectorhq.com/forms/submissions";
const CUSTOM_FIELDS_API="https://services.leadconnectorhq.com/locations";

function verifyMarketplaceSignature(raw,req){const sig=req.headers.get("x-ghl-signature");if(!sig)return false;try{return crypto.verify(null,Buffer.from(raw,"utf8"),GHL_ED25519_PUBLIC_KEY,Buffer.from(sig,"base64"))}catch{return false}}
function allowLegacySecret(req){const configured=process.env.GHL_WEBHOOK_SECRET||"";return Boolean(configured&&req.headers.get("x-webhook-secret")===configured)}
const pick=(b,...keys)=>{for(const k of keys){const v=k.includes('.')?k.split('.').reduce((o,p)=>o?.[p],b):b?.[k];if(v!==undefined&&v!==null&&v!=="")return v}return ""};
const normKey=k=>String(k||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const reserved=new Set(['location id','form id','form submission id','contact id','id','email','phone','telephone','first name','prenom','last name','nom','source','traffic source','campaign id','campaign name','form name','category','categorie','type soin','service','soin','message','notes','contact','location','form']);
const hiddenExtra=new Set(['country','timezone','full name','contact type','first name','last name','email','phone','telephone','location id','contact id','form id','form submission id','workflow','workflow name','attributionsource','attribution source','attribution source data','user agent','fbclid','gclid','type','app id','appid','timestamp','version id','versionid','webhook id','webhookid','dateadded','date added']);
function valueText(v){if(v===undefined||v===null||v==='')return '';if(Array.isArray(v))return v.map(valueText).filter(Boolean).join(', ');if(typeof v==='object'){if('value' in v)return valueText(v.value);if('answer' in v)return valueText(v.answer);if('name' in v&&Object.keys(v).length<=3)return valueText(v.name);const parts=Object.values(v).map(valueText).filter(Boolean);return parts.join(', ')}return String(v)}
function addExtra(out,k,v){const key=String(k||'').trim();if(!key)return;const nk=normKey(key);if(!nk||reserved.has(nk)||hiddenExtra.has(nk)||nk.startsWith('attribution source'))return;const txt=valueText(v).trim();if(!txt)return;const existing=Object.keys(out).find(x=>normKey(x)===nk);if(existing){if(!String(out[existing]||'').trim())out[existing]=txt;return}out[key]=txt}
function extraInfo(b){const out={};const customContainers=[b.customData,b.custom_fields,b.customFields,b.fields,b.formData,b.form_data,b.answers,b.responses];for(const custom of customContainers){if(custom&&typeof custom==='object'&&!Array.isArray(custom))for(const [k,v] of Object.entries(custom))addExtra(out,k,v)}for(const [k,v] of Object.entries(b||{})){if(['customData','custom_fields','customFields','fields','formData','form_data','answers','responses'].includes(k))continue;addExtra(out,k,v)}return out}
function technicalSubmissionKey(k){const nk=normKey(k);return !nk||['eventdata','event data','fieldsorisequance','fields ori sequance','first name','last name','full name','email','phone','telephone','name','ip','formid','form id','sessionid','session id','submissionid','submission id','signaturehash','signature hash','contactid','contact id','locationid','location id'].includes(nk)||nk.startsWith('__')&&nk.includes('event')}
function looksLikeMachineId(k){const raw=String(k||'').trim();return /^[A-Za-z0-9_-]{15,}$/.test(raw)&&!raw.includes(' ')}
function friendlyFieldLabel(k,fieldMap,index){const raw=String(k||'').trim();const direct=fieldMap?.get(raw);if(direct)return direct;const byKey=fieldMap?.get(normKey(raw));if(byKey)return byKey;if(looksLikeMachineId(raw))return `Champ personnalisé ${index+1}`;return raw}
function cleanSubmissionAnswers(others={},fieldMap=new Map()){
 const out={};let customIndex=0;
 for(const [k,v] of Object.entries(others||{})){
  if(technicalSubmissionKey(k))continue;
  const txt=valueText(v).trim();if(!txt)continue;
  const label=friendlyFieldLabel(k,fieldMap,customIndex);
  if(looksLikeMachineId(k))customIndex++;
  addExtra(out,label,txt)
 }
 return out
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function compactObject(value,depth=0){
 if(depth>5)return '[max-depth]';
 if(value===null||value===undefined||typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
 if(Array.isArray(value))return value.slice(0,50).map(v=>compactObject(v,depth+1));
 if(typeof value==='object'){
  const out={};for(const [k,v] of Object.entries(value).slice(0,100))out[k]=compactObject(v,depth+1);return out
 }
 return String(value)
}
async function probeCustomFields(state,locationId){
 if(!locationId)return {error:'locationId absent'};
 let token='';try{token=await getValidLocationToken(state,locationId,saveState,["locations/customFields.readonly"])}catch(e){return {error:`token Location: ${e?.message||e}`}}
 const versions=['v3','2023-02-21','2021-07-28'];const probes=[];
 for(const version of versions){
  try{
   const url=`${CUSTOM_FIELDS_API}/${encodeURIComponent(locationId)}/customFields?model=contact`;
   const r=await fetch(url,{headers:{Accept:'application/json',Authorization:`Bearer ${token}`,Version:version},cache:'no-store'});
   const body=await r.json().catch(async()=>({raw:await r.text().catch(()=> '')}));
   const fields=Array.isArray(body?.customFields)?body.customFields:Array.isArray(body?.fields)?body.fields:Array.isArray(body?.data)?body.data:Array.isArray(body?.data?.customFields)?body.data.customFields:[];
   probes.push({version,status:r.status,ok:r.ok,message:body?.message||body?.error||'',responseKeys:Object.keys(body||{}),fields:fields.slice(0,100).map(f=>({id:f?.id||f?._id||f?.fieldId||f?.customFieldId||'',name:f?.name||f?.label||f?.title||'',fieldKey:f?.fieldKey||f?.key||'',model:f?.model||'',dataType:f?.dataType||f?.type||''}))});
  }catch(e){probes.push({version,error:e?.message||String(e)})}
 }
 return {probes}
}
async function saveFreshLocationToken(state,locationId){
 const fresh=await exchangeLocationToken(state,locationId,saveState);
 const installs=Array.isArray(state?.ghlOAuth?.installations)?state.ghlOAuth.installations:[];
 const next=installs.some(x=>String(x.locationId)===String(locationId))
  ?installs.map(x=>String(x.locationId)===String(locationId)?{...x,...fresh}:x)
  :[...installs,fresh];
 state.ghlOAuth={...(state.ghlOAuth||{}),installations:next,updatedAt:new Date().toISOString()};
 await saveState(state);
 return fresh.accessToken
}
async function fetchLocationCustomFields(state,locationId){
 if(!locationId)return new Map();
 const url=`${CUSTOM_FIELDS_API}/${encodeURIComponent(locationId)}/customFields?model=contact`;
 const versions=['v3','2023-02-21'];
 const request=async token=>{
  let last={r:null,b:{}};
  for(const version of versions){
   const r=await fetch(url,{headers:{Accept:'application/json',Authorization:`Bearer ${token}`,Version:version},cache:'no-store'});
   const b=await r.json().catch(()=>({}));
   last={r,b,version};
   if(r.ok)return last;
   // Une erreur de version peut être contournée avec l'autre version ; une erreur
   // d'autorisation nécessite d'abord un nouveau Location Token.
   if(r.status===401||r.status===403)break;
  }
  return last
 };
 let token=await getValidLocationToken(state,locationId,saveState,["locations/customFields.readonly"]);
 let result=await request(token);
 // Après l'ajout d'un scope à l'app, un Location Token déjà stocké peut rester ancien.
 // On force une seule régénération depuis le Company Token puis on retente.
 if((result.r?.status===401||result.r?.status===403)&&state?.ghlOAuth?.agencyToken){
  token=await saveFreshLocationToken(state,locationId);
  result=await request(token);
 }
 const {r,b}=result;
 if(!r?.ok)throw new Error(Array.isArray(b?.message)?b.message.join(', '):b?.message||b?.error||`Erreur GHL custom fields (${r?.status||'inconnue'})`);
 const map=new Map();
 const rawFields=Array.isArray(b?.customFields)?b.customFields:Array.isArray(b?.fields)?b.fields:Array.isArray(b?.data)?b.data:Array.isArray(b?.data?.customFields)?b.data.customFields:[];
 for(const f of rawFields){
  // Le nom du champ est le meilleur libellé disponible via l'API Custom Fields.
  // Le placeholder reste un fallback si aucun nom n'est fourni.
  const label=String(f?.name||f?.label||f?.title||f?.placeholder||f?.fieldKey||'').trim();
  if(!label)continue;
  const aliases=[f?.id,f?._id,f?.fieldId,f?.customFieldId,f?.fieldKey,f?.key];
  for(const alias of aliases){if(!alias)continue;const a=String(alias);map.set(a,label);map.set(normKey(a),label);const short=a.replace(/^contact[._]/i,'');map.set(short,label);map.set(normKey(short),label)}
 }
 return map
}
async function fetchContactSubmissions(state,locationId,contactId){
 if(!locationId||!contactId)return [];
 const token=await getValidLocationToken(state,locationId,saveState);
 for(let attempt=0;attempt<3;attempt++){
  const url=new URL(FORMS_API);url.searchParams.set('locationId',locationId);url.searchParams.set('q',contactId);url.searchParams.set('limit','100');
  const r=await fetch(url,{headers:{Accept:'application/json',Authorization:`Bearer ${token}`,Version:'v3'},cache:'no-store'});
  const b=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(Array.isArray(b?.message)?b.message.join(', '):b?.message||b?.error||`Erreur GHL forms/submissions (${r.status})`);
  const list=Array.isArray(b?.submissions)?b.submissions:[];
  const exact=list.filter(x=>String(x?.contactId||'')===String(contactId));
  if(exact.length||attempt===2)return exact;
  await delay(650*(attempt+1));
 }
 return [];
}
function normalizeSubmission(sub,integration,fieldMap){
 const formId=String(sub?.formId||'');
 const mapping=(integration?.forms||[]).find(x=>String(x.formId||'')===formId)||{};
 return {id:String(sub?.id||uid()),formId,formName:String(mapping.formName||mapping.name||sub?.name||'Formulaire GHL'),category:String(mapping.category||'Autres'),service:String(mapping.service||''),createdAt:String(sub?.createdAt||nowIso()),answers:cleanSubmissionAnswers(sub?.others||{},fieldMap),eventData:sub?.others?.eventData||{}};
}

async function ingest(req,forcedInstitutId=""){
 const raw=await req.text();
 if(!verifyMarketplaceSignature(raw,req)&&!allowLegacySecret(req))return NextResponse.json({error:"Invalid HighLevel webhook signature"},{status:401});
 let b;try{b=JSON.parse(raw)}catch{return NextResponse.json({error:"Payload JSON invalide"},{status:400})}
 const eventType=String(b?.type||"");
 if(eventType&&eventType!=="ContactCreate"&&eventType!=="ContactUpdate")return NextResponse.json({ok:true,ignored:true,type:eventType});
 const s=await loadState();const locationId=String(pick(b,"location_id","locationId","location.id")||"");let institutId=forcedInstitutId;let integration=null;
 if(!institutId){integration=(s.integrations||[]).find(x=>x.provider==="ghl"&&String(x.locationId||"")===locationId);institutId=integration?.institutId||""}
 if(!institutId)return NextResponse.json({error:"Aucun client Presty associé à ce Location ID GHL"},{status:404});
 const targetClient=s.instituts.find(i=>i.id===institutId);if(!targetClient)return NextResponse.json({error:"Compte client introuvable"},{status:404});if(targetClient.archived||targetClient.active===false)return NextResponse.json({error:"Compte client archivé"},{status:410});
 if(!integration)integration=(s.integrations||[]).find(x=>x.provider==="ghl"&&x.institutId===institutId)||null;
 const contactId=String(pick(b,"contact_id","contactId","contact.id","id")||"");const email=String(pick(b,"email","contact.email")||"");const phone=String(pick(b,"phone","telephone","contact.phone")||"");
 const existing=s.leads.find(x=>x.institutId===institutId&&((contactId&&x.ghlContactId===contactId)||(email&&x.email===email)||(phone&&x.telephone===phone)));
 let fetched=[];let submissionError='';let customFieldMap=new Map();let customFieldError='';
 try{fetched=await fetchContactSubmissions(s,locationId,contactId)}catch(e){submissionError=e?.message||'Impossible de récupérer les soumissions GHL'}
 try{customFieldMap=await fetchLocationCustomFields(s,locationId)}catch(e){customFieldError=e?.message||'Impossible de récupérer les libellés des champs GHL'}
 const previousSubs=Array.isArray(existing?.formSubmissions)?existing.formSubmissions:[];
 const byId=new Map(previousSubs.map(x=>[String(x.id),x]));for(const sub of fetched){const n=normalizeSubmission(sub,integration,customFieldMap);byId.set(String(n.id),n)}
 const formSubmissions=[...byId.values()].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
 const latest=formSubmissions.at(-1)||null;
 const sourceLabel=String(pick(b,"form_name","formName","form.name","source","contact.source","Contact Source")||"").trim();
 const explicitFormId=String(pick(b,"form_id","formId","form.id")||"");
 const webhookMapping=(integration?.forms||[]).find(x=>String(x.formId||"")===explicitFormId)||(integration?.forms||[]).find(x=>sourceLabel&&normKey(x.formName||x.name)===normKey(sourceLabel))||{};
 const mapping=latest?((integration?.forms||[]).find(x=>String(x.formId||"")===String(latest.formId))||webhookMapping):webhookMapping;
 const formName=String(latest?.formName||mapping.formName||mapping.name||sourceLabel||existing?.formName||"Formulaire GHL");
 const newSubs=formSubmissions.filter(sub=>!previousSubs.some(prev=>String(prev.id)===String(sub.id)));
 const activity=[...(existing?.activity||[])];
 if(!existing)activity.push({id:uid(),type:"Contact créé",text:"Nouveau contact reçu depuis GoHighLevel",createdAt:nowIso()});
 for(const sub of newSubs)activity.push({id:uid(),type:"Nouvelle soumission de formulaire",text:`${sub.formName||"Formulaire GHL"} · nouvelle demande reçue`,createdAt:sub.createdAt||nowIso()});
 const patch=normalizeLead({...existing,id:existing?.id||uid(),institutId,dateContact:existing?.dateContact||today(),prenom:pick(b,"first_name","firstName","prenom","contact.firstName")||existing?.prenom||"",nom:pick(b,"last_name","lastName","nom","contact.lastName")||existing?.nom||"",telephone:phone||existing?.telephone||"",email:email||existing?.email||"",category:latest?.category||mapping.category||existing?.category||"Autres",typeSoin:latest?.service||mapping.service||existing?.typeSoin||"",formName,source:formName,channel:existing?.channel||"GoHighLevel",problematique:existing?.problematique||"",additionalInfo:{...(existing?.additionalInfo||{}),...extraInfo(b)},formSubmissions,statut:existing?.statut||"Nouveau lead",converted:existing?.converted||false,value:existing?.value||0,ghlContactId:contactId||existing?.ghlContactId||"",ghlLocationId:locationId||existing?.ghlLocationId||"",ghlFormId:String(latest?.formId||explicitFormId||existing?.ghlFormId||""),updatedAt:nowIso(),activity});
 const customFieldProbe=await probeCustomFields(s,locationId);
 const diagnostic={
  id:uid(),createdAt:nowIso(),eventType,locationId,institutId,contactId,formName,
  webhook:{keys:Object.keys(b||{}),source:b?.source||'',customFields:compactObject(b?.customFields||[]),payload:compactObject(b)},
  submissions:{count:fetched.length,items:fetched.slice(-10).map(sub=>({id:sub?.id||'',contactId:sub?.contactId||'',formId:sub?.formId||'',createdAt:sub?.createdAt||'',name:sub?.name||'',othersKeys:Object.keys(sub?.others||{}),others:compactObject(sub?.others||{})}))},
  customFields:{normalFetchError:customFieldError||'',resolvedMap:[...customFieldMap.entries()].slice(0,200),probe:customFieldProbe},
  mapping:{explicitFormId,sourceLabel,latestFormId:latest?.formId||'',latestAnswers:latest?.answers||{},integrationForms:compactObject(integration?.forms||[])},
  errors:{submissionError:submissionError||'',customFieldError:customFieldError||''}
 };
 s.ghlDiagnostics=[diagnostic,...(Array.isArray(s.ghlDiagnostics)?s.ghlDiagnostics:[])].slice(0,10);
 s.leads=existing?s.leads.map(x=>x.id===existing.id?patch:x):[patch,...s.leads];await saveState(s);
 return NextResponse.json({ok:true,leadId:patch.id,created:!existing,institutId,submissions:formSubmissions.length,newSubmissions:Math.max(0,formSubmissions.length-previousSubs.length),diagnosticId:diagnostic.id,submissionError:submissionError||undefined,customFieldError:customFieldError||undefined});
}
export async function POST(req,{params}={}){let forced="";if(params){const p=await params;forced=p?.institutId||""}try{return await ingest(req,forced)}catch(e){return NextResponse.json({error:e.message},{status:500})}}
export async function POST_GENERIC(req){try{return await ingest(req,"")}catch(e){return NextResponse.json({error:e.message},{status:500})}}
