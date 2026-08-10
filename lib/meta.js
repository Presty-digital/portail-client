import {getSession,allowedIds} from '@/lib/session';

const GRAPH_VERSION=process.env.META_GRAPH_VERSION||'v23.0';
const GRAPH_BASE=`https://graph.facebook.com/${GRAPH_VERSION}`;

export async function requireMetaAccess(institutId=''){
  const session=await getSession();
  if(!session)throw Object.assign(new Error('Non autorisé'),{status:401});
  if(institutId&&session.role!=='agency_admin'){
    const ids=allowedIds(session)||[];
    if(!ids.includes(institutId))throw Object.assign(new Error('Accès refusé'),{status:403});
  }
  return session;
}

export async function metaFetch(path,params={}){
  const token=process.env.META_ACCESS_TOKEN;
  if(!token)throw Object.assign(new Error('META_ACCESS_TOKEN absent de Vercel'),{status:500});
  const url=new URL(`${GRAPH_BASE}/${String(path).replace(/^\//,'')}`);
  Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,String(v))});
  url.searchParams.set('access_token',token);
  const response=await fetch(url,{cache:'no-store'});
  const json=await response.json().catch(()=>({}));
  if(!response.ok||json.error){
    const message=json?.error?.message||`Erreur Meta (${response.status})`;
    throw Object.assign(new Error(message),{status:response.status||500,meta:json?.error});
  }
  return json;
}

export function normalizeAdAccount(a={}){
  return {id:a.id,accountId:a.account_id||String(a.id||'').replace(/^act_/,''),name:a.name||a.id,status:a.account_status,currency:a.currency||'EUR',timezone:a.timezone_name||'',business:a.business?.name||''};
}

export function actionValue(actions=[],matcher){
  return (actions||[]).filter(a=>matcher(String(a.action_type||''))).reduce((s,a)=>s+Number(a.value||0),0);
}
export function leadCount(actions=[]){
  return actionValue(actions,t=>t==='lead'||t.includes('leadgen')||t.includes('lead_grouped')||t==='onsite_conversion.lead');
}
