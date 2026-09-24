import {NextResponse} from "next/server";
import crypto from "node:crypto";
import {loadState,saveState,loadStateVersioned,saveStateIfUnchanged} from "@/lib/db";
import {uid,today,nowIso,normalizeLead} from "@/lib/state";
import {getValidLocationToken,exchangeLocationToken,persistLocationToken} from "@/lib/ghl-oauth";
import {config as supabaseConfig,headers as supabaseHeaders} from "@/lib/config";

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

function decodeHtmlText(value){
 return String(value||'')
  .replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16)))
  .replace(/\\n|\\r|\\t/g,' ')
  .replace(/\\\"/g,'"').replace(/\\'/g,"'").replace(/\\\\/g,'\\')
  .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
  .replace(/&#x([0-9a-fA-F]+);/g,(_,h)=>String.fromCharCode(parseInt(h,16)))
  .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
}
function answerValueSet(values=[]){
 const out=new Set();for(const raw of values||[]){const txt=valueText(raw).trim();if(!txt)continue;out.add(normKey(txt));for(const part of txt.split(',')){const n=normKey(part);if(n)out.add(n)}}return out
}
function plausibleQuestionLabel(value,id='',answerValues=[]){
 const v=decodeHtmlText(value).trim();if(v.length<2||v.length>240)return '';
 const n=normKey(v);if(!n||normKey(id)===n)return '';
 if(/^(input|select|textarea|radio|checkbox|custom field|customfield|field|form field|option|required|true|false|null|undefined)$/i.test(v))return '';
 if(/^contact[._-]/i.test(v)||looksLikeMachineId(v))return '';
 const answers=answerValueSet(answerValues);if(answers.has(n))return '';
 return v
}
function extractObjectAround(source,pos,max=5000){
 let left=pos,depth=0,inStr=false,esc=false,start=-1;
 for(let i=pos;i>=Math.max(0,pos-max);i--){const c=source[i];if(inStr){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')inStr=false;continue}if(c==='"'){inStr=true;continue}if(c==='}')depth++;else if(c==='{'){if(depth===0){start=i;break}depth--}}
 if(start<0)return '';
 depth=0;inStr=false;esc=false;
 for(let i=start;i<Math.min(source.length,start+max*2);i++){const c=source[i];if(inStr){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')inStr=false;continue}if(c==='"'){inStr=true;continue}if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return source.slice(start,i+1)}}
 return ''
}
function extractPublicFormLabels(html,wantedIds=[],answerValuesById={}){
 const map=new Map(),source=String(html||'');if(!source)return map;
 const keys='label|question|questionLabel|fieldLabel|customFieldLabel|title|placeholder|name';
 for(const rawId of wantedIds){
  const id=String(rawId||'').trim();if(!id)continue;const answerValues=answerValuesById?.[id]||[];
  let best=null,start=0,guard=0;
  while(guard++<20){
   const pos=source.indexOf(id,start);if(pos<0)break;start=pos+id.length;
   const chunks=[];const obj=extractObjectAround(source,pos);if(obj)chunks.push({text:obj,idPos:pos-Math.max(0,source.lastIndexOf(obj,pos))||0,object:true});
   const left=Math.max(0,pos-2200),right=Math.min(source.length,pos+id.length+2200);chunks.push({text:source.slice(left,right),idPos:pos-left,object:false});
   for(const ch of chunks){const chunk=ch.text,idPos=ch.idPos;
    const candidates=[];
    const jsonRe=new RegExp('(?:"|\\\\")('+keys+')(?:"|\\\\")\\s*:\\s*(?:"|\\\\")([^"\\n\\r]{2,260}?)(?:"|\\\\")','gi');
    let m;while((m=jsonRe.exec(chunk))){const label=plausibleQuestionLabel(m[2],id,answerValues);if(label)candidates.push({label,key:m[1],distance:Math.abs(m.index-idPos),object:ch.object})}
    const attrRe=/(?:data-label|aria-label|placeholder|title)\s*=\s*["']([^"']{2,260})["']/gi;
    while((m=attrRe.exec(chunk))){const label=plausibleQuestionLabel(m[1],id,answerValues);if(label)candidates.push({label,key:'label',distance:Math.abs(m.index-idPos),object:ch.object})}
    const labelRe=/<label\b[^>]*>([\s\S]{1,400}?)<\/label>/gi;
    while((m=labelRe.exec(chunk))){const label=plausibleQuestionLabel(m[1],id,answerValues);if(label)candidates.push({label,key:'label',distance:Math.abs(m.index-idPos),object:ch.object})}
    for(const c of candidates){
     const rank=/^(question|questionLabel|fieldLabel|customFieldLabel|label)$/i.test(c.key)?0:/^(title)$/i.test(c.key)?1:/^(placeholder)$/i.test(c.key)?2:3;
     const questionBonus=/\?|\*$/.test(c.label.trim())?-2500:0;
     const lengthBonus=c.label.length>=18?-900:0;
     const objectBonus=c.object?-1200:0;
     const score=rank*10000+c.distance+questionBonus+lengthBonus+objectBonus;
     if(!best||score<best.score)best={label:c.label,score};
    }
   }
  }
  if(best?.label){map.set(id,best.label);map.set(normKey(id),best.label)}
 }
 return map
}
async function fetchPublicFormFieldLabels(formId,wantedIds=[],answerValuesById={}){
 const id=String(formId||'').trim();if(!id||!wantedIds.length)return new Map();
 try{
  const r=await fetch(`https://api.leadconnectorhq.com/widget/form/${encodeURIComponent(id)}`,{headers:{Accept:'text/html,application/xhtml+xml'},cache:'no-store',redirect:'follow'});
  if(!r.ok)return new Map();
  const html=await r.text();return extractPublicFormLabels(html,wantedIds,answerValuesById)
 }catch{return new Map()}
}
function submissionAnswerValuesByField(submissions=[]){
 const out={};for(const sub of submissions||[])for(const [k,v] of Object.entries(sub?.others||{})){if(looksLikeMachineId(k)&&!technicalSubmissionKey(k)){out[String(k)]??=[];out[String(k)].push(v)}}return out
}
function submissionMachineIds(submissions=[]){
 const out=new Set();for(const sub of submissions||[])for(const key of Object.keys(sub?.others||{})){if(looksLikeMachineId(key)&&!technicalSubmissionKey(key))out.add(String(key))}return [...out]
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
 // V21.44 : persistance depuis un état FRAIS, ghlOAuth uniquement. Ne réécrit plus
 // jamais la copie `state` chargée au début du webhook.
 await persistLocationToken(state,locationId,fresh,saveState);
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

// V21.44 — helpers de sécurisation du webhook.
const RECENT_SUBMISSION_MS=48*60*60*1000;
function isRecentSubmission(sub){const t=Date.parse(String(sub?.createdAt||''));if(!Number.isFinite(t))return false;const age=Date.now()-t;return age<=RECENT_SUBMISSION_MS&&age>=-60*60*1000}
// Un lead « vierge » n'a encore reçu AUCUN travail commercial dans PRESTY.
function isPristineLead(lead,firstStatus){
 const cat=lead?.latestCategory||lead?.category;const t=lead?.commercialByCategory?.[cat]||{};
 const status=String(t.status||t.statut||lead?.statut||'');
 const initial=!status||status===firstStatus||status==='Nouveau';
 const hasList=v=>Array.isArray(v)&&v.length>0;
 return initial&&!Number(t.value||0)&&!Number(lead?.value||0)&&!t.converted&&!lead?.converted
  &&!t.rdvAt&&!lead?.rdvAt&&!t.nextActionAt&&!lead?.nextActionAt
  &&!hasList(t.actions)&&!hasList(t.comments)&&!hasList(lead?.comments);
}
// Rejets journalisés HORS app_state (table dédiée, insertion seule). Ne bloque jamais le webhook.
async function logRejection({reason,eventType,locationId,institutId,contactId,payload,submissions,submissionError}){
 const row={reason,event_type:eventType||'',location_id:locationId||'',institut_id:institutId||'',contact_id:contactId||'',submissions_count:Number(submissions||0),submission_error:submissionError||'',payload:payload||{}};
 try{
  const {url}=supabaseConfig();
  const r=await fetch(`${url}/rest/v1/ghl_webhook_rejections`,{method:'POST',headers:supabaseHeaders({Prefer:'return=minimal'}),body:JSON.stringify(row),cache:'no-store'});
  if(!r.ok)throw new Error(await r.text());
 }catch(e){console.error('[ghl-webhook] rejet non journalisé en base',e?.message||e,JSON.stringify(row))}
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
 const payloadPrenom=String(pick(b,"first_name","firstName","prenom","contact.firstName")||"").trim();
 const payloadNom=String(pick(b,"last_name","lastName","nom","contact.lastName")||"").trim();
 // V21.44 — PHASE 1 : tous les appels réseau GHL. La copie `s` ne sert plus que de
 // contexte en lecture (intégration, mapping des formulaires, tokens). Elle n'est
 // JAMAIS réécrite dans app_state.
 let fetched=[];let submissionError='';let customFieldMap=new Map();let customFieldError='';let publicFormMap=new Map();
 try{fetched=await fetchContactSubmissions(s,locationId,contactId)}catch(e){submissionError=e?.message||'Impossible de récupérer les soumissions GHL'}
 try{customFieldMap=await fetchLocationCustomFields(s,locationId)}catch(e){customFieldError=e?.message||'Impossible de récupérer les libellés des champs GHL'}
 // Fallback indépendant des scopes OAuth : les formulaires GHL intégrés sont publics.
 // Pour l'affichage d'une soumission, le libellé visible dans le formulaire prime sur
 // le nom interne du Custom Field GHL.
 const submissionIds=submissionMachineIds(fetched);
 if(submissionIds.length){
  const formIds=[...new Set(fetched.map(x=>String(x?.formId||'')).filter(Boolean))];
  const answerValuesById=submissionAnswerValuesByField(fetched);
  for(const fid of formIds){
   const m=await fetchPublicFormFieldLabels(fid,submissionIds,answerValuesById);
   for(const [k,v] of m){publicFormMap.set(k,v);customFieldMap.set(k,v)}
  }
 }
 // V21.44 : probeCustomFields retiré du traitement normal (3 appels API + tokens à chaque événement).
 const fetchedSubs=fetched.map(sub=>normalizeSubmission(sub,integration,customFieldMap));
 const sourceLabel=String(pick(b,"form_name","formName","form.name","source","contact.source","Contact Source")||"").trim();
 const explicitFormId=String(pick(b,"form_id","formId","form.id")||"");
 const webhookMapping=(integration?.forms||[]).find(x=>String(x.formId||"")===explicitFormId)||(integration?.forms||[]).find(x=>sourceLabel&&normKey(x.formName||x.name)===normKey(sourceLabel))||{};

 // V21.44 — PHASE 2 : écriture conditionnelle (CAS sur updated_at). On relit l'état frais,
 // on calcule la mutation ciblée sur CE contact, puis on écrit uniquement si app_state n'a
 // pas changé depuis la lecture. En cas de conflit : relecture + réapplication (5 essais).
 // Plus aucun appel réseau GHL dans cette phase.
 const isCreateEvent=eventType==="ContactCreate";
 // Règle des 48 h : UNIQUEMENT sur le timestamp original renvoyé par GHL (jamais le
 // fallback d'affichage). Date absente ou invalide = non prouvée récente.
 const recentRawCount=fetched.filter(isRecentSubmission).length;
 for(let attempt=1;attempt<=5;attempt++){
  const {state:fresh,previous,updatedAt:version}=await loadStateVersioned();
  const freshClient=fresh.instituts.find(i=>i.id===institutId);
  if(!freshClient)return NextResponse.json({error:"Compte client introuvable"},{status:404});
  const existing=fresh.leads.find(x=>x.institutId===institutId&&((contactId&&x.ghlContactId===contactId)||(email&&x.email===email)||(phone&&x.telephone===phone)));
  const firstStatus=freshClient?.pipelineConfig?.[0]?.label||freshClient?.pipeline?.[0]||"Nouveau";
  const previousSubs=Array.isArray(existing?.formSubmissions)?existing.formSubmissions:[];
  const byId=new Map(previousSubs.map(x=>[String(x.id),x]));for(const n of fetchedSubs)byId.set(String(n.id),n);
  const formSubmissions=[...byId.values()].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
  const latest=formSubmissions.at(-1)||null;
  const mapping=latest?((integration?.forms||[]).find(x=>String(x.formId||"")===String(latest.formId))||webhookMapping):webhookMapping;
  const formName=String(latest?.formName||mapping.formName||mapping.name||sourceLabel||existing?.formName||"Formulaire GHL");
  const newSubs=formSubmissions.filter(sub=>!previousSubs.some(prev=>String(prev.id)===String(sub.id)));
  const diagnostic={
   id:uid(),createdAt:nowIso(),eventType,locationId,institutId,contactId,formName,
   webhook:{keys:Object.keys(b||{}),source:b?.source||'',customFields:compactObject(b?.customFields||[]),payload:compactObject(b)},
   submissions:{count:fetched.length,items:fetched.slice(-10).map(sub=>({id:sub?.id||'',contactId:sub?.contactId||'',formId:sub?.formId||'',createdAt:sub?.createdAt||'',name:sub?.name||'',othersKeys:Object.keys(sub?.others||{}),others:compactObject(sub?.others||{})}))},
   customFields:{normalFetchError:customFieldError||'',resolvedMap:[...customFieldMap.entries()].slice(0,200),publicFormMap:[...publicFormMap.entries()].slice(0,200)},
   mapping:{explicitFormId,sourceLabel,latestFormId:latest?.formId||'',latestAnswers:latest?.answers||{},integrationForms:compactObject(integration?.forms||[])},
   errors:{submissionError:submissionError||'',customFieldError:customFieldError||''}
  };

  let lead;let created=false;
  if(!existing){
   // V21.44 — règles de création strictes.
   // ContactCreate EXPLICITE : création si soumission récupérée OU prénom/nom OU téléphone.
   // ContactUpdate ET événement sans type/inconnu : création UNIQUEMENT si une soumission
   // de moins de 48 h (timestamp GHL original) est récupérée.
   let reason='';
   if(!isCreateEvent&&!recentRawCount)reason=eventType?'contact_update_inconnu_sans_soumission_recente':'evenement_sans_type_sans_soumission_recente';
   else if(isCreateEvent&&!fetchedSubs.length&&!payloadPrenom&&!payloadNom&&!phone)reason='contact_create_sans_identite_ni_soumission';
   if(reason){
    await logRejection({reason,eventType,locationId,institutId,contactId,payload:b,submissions:fetched.length,submissionError});
    return NextResponse.json({ok:true,ignored:true,reason});
   }
   const activity=[{id:uid(),type:"Contact créé",text:"Nouveau contact reçu depuis GoHighLevel",createdAt:nowIso()}];
   for(const sub of newSubs)activity.push({id:uid(),type:"Nouvelle soumission de formulaire",text:`${sub.formName||"Formulaire GHL"} · nouvelle demande reçue`,createdAt:sub.createdAt||nowIso()});
   const incomingCategory=String(latest?.category||mapping.category||"Autres");
   const submissionCategories=formSubmissions.map(sub=>String(sub?.category||"").trim()).filter(Boolean);
   const categories=[...new Set([...submissionCategories,incomingCategory].filter(Boolean))];
   const commercialByCategory={};
   for(const cat of categories)commercialByCategory[cat]={category:cat,status:firstStatus,value:0,converted:false,updatedAt:nowIso()};
   lead=normalizeLead({id:uid(),institutId,dateContact:today(),prenom:payloadPrenom,nom:payloadNom,telephone:phone,email,categories,latestCategory:incomingCategory,commercialByCategory,category:incomingCategory,typeSoin:latest?.service||mapping.service||"",formName,source:formName,channel:"GoHighLevel",problematique:"",additionalInfo:{...extraInfo(b)},formSubmissions,statut:firstStatus,converted:false,value:0,ghlContactId:contactId,ghlLocationId:locationId,ghlFormId:String(latest?.formId||explicitFormId||""),updatedAt:nowIso(),activity});
   created=true;
  }else{
   // V21.44 — lead existant : fusion des SEULS champs appartenant à GHL dans la version
   // FRAÎCHE du lead. Jamais modifiés ici : statut, value, converted, rdvAt/rdvDuration/rdvType,
   // nextActionAt/nextActionType, actions, commentaires, entrées commercialByCategory existantes,
   // tags, archivage, dateContact.
   const activity=[...(existing.activity||[])];
   for(const sub of newSubs)activity.push({id:uid(),type:"Nouvelle soumission de formulaire",text:`${sub.formName||"Formulaire GHL"} · nouvelle demande reçue`,createdAt:sub.createdAt||nowIso()});
   const previousCategories=Array.isArray(existing.categories)&&existing.categories.length?existing.categories:[existing.category].filter(Boolean);
   // Nouvelles catégories : uniquement celles apportées par une NOUVELLE soumission.
   const newSubCategories=[...new Set(newSubs.map(sub=>String(sub?.category||"").trim()).filter(Boolean))];
   const addedCategories=newSubCategories.filter(cat=>!previousCategories.includes(cat));
   const categories=[...previousCategories,...addedCategories];
   const commercialByCategory={...(existing.commercialByCategory||{})};
   for(const cat of addedCategories){if(!commercialByCategory[cat])commercialByCategory[cat]={category:cat,status:firstStatus,value:0,converted:false,updatedAt:nowIso()}}
   const next={...existing,
    prenom:payloadPrenom||existing.prenom||"",nom:payloadNom||existing.nom||"",telephone:phone||existing.telephone||"",email:email||existing.email||"",
    categories,commercialByCategory,
    typeSoin:latest?.service||mapping.service||existing.typeSoin||"",formName,source:formName,channel:existing.channel||"GoHighLevel",
    additionalInfo:{...(existing.additionalInfo||{}),...extraInfo(b)},formSubmissions,
    ghlContactId:contactId||existing.ghlContactId||"",ghlLocationId:locationId||existing.ghlLocationId||"",ghlFormId:String(latest?.formId||explicitFormId||existing.ghlFormId||""),
    activity};
   // Cas unique où la catégorie principale peut changer : le lead n'a encore AUCUN suivi
   // commercial (typiquement créé par ContactCreate avant que la soumission soit disponible)
   // et une nouvelle soumission arrive. Rien de PRESTY n'est écrasé puisque rien n'existait.
   const lastNewCategory=String(newSubs.at(-1)?.category||"").trim();
   if(lastNewCategory&&lastNewCategory!==(existing.latestCategory||existing.category)&&isPristineLead(existing,firstStatus)){
    next.latestCategory=lastNewCategory;next.category=lastNewCategory;next.statut=commercialByCategory[lastNewCategory]?.status||firstStatus;next.value=0;next.converted=false;
   }
   const {updatedAt:_a,...cmpNext}=next;const {updatedAt:_b,...cmpOld}=existing;
   if(JSON.stringify(cmpNext)===JSON.stringify(cmpOld)){
    // Aucun changement : on n'écrit PAS les 1,1 Mo d'app_state pour rien.
    return NextResponse.json({ok:true,leadId:existing.id,created:false,unchanged:true,institutId});
   }
   lead={...next,updatedAt:nowIso()};
  }
  fresh.ghlDiagnostics=[diagnostic,...(Array.isArray(fresh.ghlDiagnostics)?fresh.ghlDiagnostics:[])].slice(0,10);
  fresh.leads=created?[lead,...fresh.leads]:fresh.leads.map(x=>x.id===lead.id?lead:x);
  if(await saveStateIfUnchanged(fresh,version,previous)){
   return NextResponse.json({ok:true,leadId:lead.id,created,institutId,submissions:formSubmissions.length,newSubmissions:newSubs.length,diagnosticId:diagnostic.id,attempts:attempt,submissionError:submissionError||undefined,customFieldError:customFieldError||undefined});
  }
  // Conflit : app_state a changé entre la lecture et l'écriture. On recommence depuis
  // un état frais ; la mutation est recalculée, jamais la copie précédente réécrite.
  await delay(80*attempt+Math.floor(Math.random()*120));
 }
 // 5 conflits d'affilée : on n'écrase rien. Code 503 pour que GHL renvoie l'événement.
 console.error('[ghl-webhook] conflit persistant, événement non appliqué',JSON.stringify({eventType,locationId,institutId,contactId}));
 return NextResponse.json({error:"Conflit d'écriture persistant, réessayer"},{status:503});
}
export async function POST(req,{params}={}){let forced="";if(params){const p=await params;forced=p?.institutId||""}try{return await ingest(req,forced)}catch(e){return NextResponse.json({error:e.message},{status:500})}}
export async function POST_GENERIC(req){try{return await ingest(req,"")}catch(e){return NextResponse.json({error:e.message},{status:500})}}
