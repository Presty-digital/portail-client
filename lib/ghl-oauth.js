const TOKEN_URL="https://services.leadconnectorhq.com/oauth/token";
const API_BASE="https://services.leadconnectorhq.com";
const REDIRECT_URI=process.env.GHL_REDIRECT_URI||"https://portail-client-brown.vercel.app/api/integrations/crm/callback";
const API_VERSION="2021-07-28";

function credentials(){
  const clientId=process.env.GHL_CLIENT_ID||"",clientSecret=process.env.GHL_CLIENT_SECRET||"";
  if(!clientId||!clientSecret)throw new Error("GHL_CLIENT_ID / GHL_CLIENT_SECRET manquants");
  return{clientId,clientSecret};
}
export function appId(){
  return process.env.GHL_APP_ID||String(process.env.GHL_CLIENT_ID||"").split("-")[0]||"6a797b77d0061c571740aa09";
}
function apiError(body,status,fallback){
  const raw=Array.isArray(body?.message)?body.message.join(", "):body?.message||body?.error_description||(typeof body?.error==="string"?body.error:body?.error?.message)||fallback||`Erreur HighLevel (${status})`;
  return String(raw||`Erreur HighLevel (${status})`);
}
async function parseJson(response){return response.json().catch(()=>({}));}
async function tokenRequest(params){
  const response=await fetch(TOKEN_URL,{
    method:"POST",
    headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded",Version:API_VERSION},
    body:new URLSearchParams(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&String(v)!=="").map(([k,v])=>[k,String(v)])),
    cache:"no-store"
  });
  const body=await parseJson(response);
  if(!response.ok)throw new Error(apiError(body,response.status,`Erreur OAuth GHL (${response.status})`));
  return body;
}
export async function exchangeAuthorizationCode(code){
  const{clientId,clientSecret}=credentials();
  return tokenRequest({clientId,clientSecret,grantType:"authorization_code",code:String(code||""),userType:"Company",redirectUri:REDIRECT_URI});
}
export async function refreshAccessToken(refreshToken,userType="Company"){
  const{clientId,clientSecret}=credentials();
  return tokenRequest({clientId,clientSecret,grantType:"refresh_token",refreshToken:String(refreshToken||""),userType:String(userType||"Company")});
}
export function normalizeToken(body,previous={}){
  const expiresIn=Number(body?.expiresIn??body?.expires_in??86400);
  const approved=body?.approvedLocations??body?.approved_locations??previous.approvedLocations??[];
  return{
    locationId:String(body?.locationId??body?.location_id??previous.locationId??""),
    companyId:String(body?.companyId??body?.company_id??previous.companyId??""),
    userId:String(body?.userId??body?.user_id??previous.userId??""),
    userType:String(body?.userType??body?.user_type??previous.userType??"Location"),
    accessToken:String(body?.accessToken??body?.access_token??previous.accessToken??""),
    refreshToken:String(body?.refreshToken??body?.refresh_token??previous.refreshToken??""),
    tokenType:String(body?.tokenType??body?.token_type??previous.tokenType??"Bearer"),
    scope:Array.isArray(body?.scope)?body.scope.join(" "):String(body?.scope??previous.scope??""),
    approvedLocations:Array.isArray(approved)?approved.map(String):[],
    isBulkInstallation:Boolean(body?.isBulkInstallation??body?.is_bulk_installation??previous.isBulkInstallation),
    installToFutureLocations:Boolean(body?.installToFutureLocations??body?.install_to_future_locations??previous.installToFutureLocations),
    approveAllLocations:Boolean(body?.approveAllLocations??body?.approve_all_locations??previous.approveAllLocations),
    expiresAt:new Date(Date.now()+Math.max(60,expiresIn-120)*1000).toISOString(),
    updatedAt:new Date().toISOString(),
    installedAt:previous.installedAt||new Date().toISOString()
  };
}
export function oauthInstallations(state){return Array.isArray(state?.ghlOAuth?.installations)?state.ghlOAuth.installations:[]}
export function hasAgencyToken(state){return Boolean(state?.ghlOAuth?.agencyToken?.accessToken)}
export function publicAgencyStatus(state){
  const t=state?.ghlOAuth?.agencyToken||{};
  return{connected:Boolean(t.accessToken),companyId:t.companyId||"",userType:t.userType||"",expiresAt:t.expiresAt||"",isBulkInstallation:Boolean(t.isBulkInstallation),installToFutureLocations:Boolean(t.installToFutureLocations),approveAllLocations:Boolean(t.approveAllLocations),approvedLocationsCount:Array.isArray(t.approvedLocations)?t.approvedLocations.length:0,credentialsConfigured:Boolean(process.env.GHL_CLIENT_ID&&process.env.GHL_CLIENT_SECRET),redirectUri:REDIRECT_URI};
}
export async function getValidAgencyToken(state,saveState){
  let item=state?.ghlOAuth?.agencyToken;
  if(!item?.accessToken)throw new Error("L’accès agence GoHighLevel n’a pas encore été initialisé dans Presty");
  if(String(item.userType||"").toLowerCase()!=="company")throw new Error("Le jeton GoHighLevel enregistré n’est pas un jeton agence (Company)");
  if(item.expiresAt&&new Date(item.expiresAt).getTime()>Date.now()+60000)return item;
  if(!item.refreshToken)throw new Error("Le token agence GHL a expiré et aucun refresh token n’est disponible. Réinitialisez l’accès agence.");
  item=normalizeToken(await refreshAccessToken(item.refreshToken,"Company"),item);
  state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,agencyToken:item,lastError:"",updatedAt:new Date().toISOString()};
  await saveState(state);
  return item;
}
async function fetchInstalledLocations(agency){
  if(!agency.companyId)throw new Error("Le token agence GHL ne contient pas de companyId");
  const id=appId(),all=[];let skip=0;const limit=100;
  for(let page=0;page<20;page++){
    const q=new URLSearchParams({companyId:agency.companyId,appId:id,isInstalled:"true",skip:String(skip),limit:String(limit)});
    const r=await fetch(`${API_BASE}/oauth/installedLocations?${q}`,{headers:{Accept:"application/json",Authorization:`Bearer ${agency.accessToken}`,Version:API_VERSION},cache:"no-store"});
    const b=await parseJson(r);
    if(!r.ok)throw Object.assign(new Error(apiError(b,r.status,`Impossible de récupérer les sous-comptes installés (${r.status})`)),{status:r.status});
    const list=b?.locations||b?.data?.locations||b?.data||b?.items||b?.results||[];
    if(Array.isArray(list))all.push(...list);
    const count=Number(b?.count??b?.total??all.length);
    if(!Array.isArray(list)||list.length<limit||all.length>=count)break;
    skip+=list.length;
  }
  return all;
}
export async function getInstalledLocations(state,saveState){
  const agency=await getValidAgencyToken(state,saveState);
  try{
    const list=await fetchInstalledLocations(agency);
    if(list.length)return list;
    if(Array.isArray(agency.approvedLocations)&&agency.approvedLocations.length)return agency.approvedLocations.map(id=>({_id:id,locationId:id,isInstalled:true}));
    return [];
  }catch(e){
    if(Array.isArray(agency.approvedLocations)&&agency.approvedLocations.length)return agency.approvedLocations.map(id=>({_id:id,locationId:id,isInstalled:true}));
    if(e?.status===401||e?.status===403)throw new Error(`${e.message}. Vérifiez que oauth.readonly est autorisé sur la version installée.`);
    throw e;
  }
}
export async function exchangeLocationToken(state,locationId,saveState){
  const agency=await getValidAgencyToken(state,saveState);
  const r=await fetch(`${API_BASE}/oauth/locationToken`,{
    method:"POST",
    headers:{Accept:"application/json",Authorization:`Bearer ${agency.accessToken}`,Version:API_VERSION,"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({companyId:String(agency.companyId),locationId:String(locationId)}),cache:"no-store"
  });
  const b=await parseJson(r);
  if(!r.ok){
    const msg=apiError(b,r.status,`Impossible de créer le token du sous-compte (${r.status})`);
    if(r.status===401||r.status===403)throw new Error(`${msg}. Le scope oauth.write est requis dans HighLevel.`);
    throw new Error(msg);
  }
  return normalizeToken({...b,locationId,companyId:agency.companyId},{locationId,companyId:agency.companyId,userType:"Location"});
}
export async function syncInstalledLocations(state,saveState){
  const locations=await getInstalledLocations(state,saveState);
  let installs=oauthInstallations(state),seen=new Set();
  for(const loc of locations){
    const locationId=String(loc?.locationId||loc?._id||loc?.id||"");
    if(!locationId)continue;
    if(loc?.isInstalled===false)continue;
    seen.add(locationId);
    let item=installs.find(x=>String(x.locationId)===locationId);
    if(!item?.accessToken)item=await exchangeLocationToken(state,locationId,saveState);
    item={...item,locationId,locationName:loc?.name||loc?.locationName||item?.locationName||locationId,address:loc?.address||item?.address||"",isInstalled:true};
    installs=installs.some(x=>String(x.locationId)===locationId)?installs.map(x=>String(x.locationId)===locationId?item:x):[...installs,item];
  }
  if(seen.size)installs=installs.map(x=>seen.has(String(x.locationId))?x:{...x,isInstalled:false});
  state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,installations:installs,lastError:"",lastSyncAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await saveState(state);
  return installs.filter(x=>x.isInstalled!==false);
}
export async function getValidLocationToken(state,locationId,saveState){
  let installs=oauthInstallations(state),item=installs.find(x=>String(x.locationId)===String(locationId));
  if(!item?.accessToken&&state?.ghlOAuth?.agencyToken){
    item=await exchangeLocationToken(state,locationId,saveState);
    installs=installs.some(x=>String(x.locationId)===String(locationId))?installs.map(x=>String(x.locationId)===String(locationId)?item:x):[...installs,item];
    state.ghlOAuth={...(state.ghlOAuth||{}),installations:installs};await saveState(state);
  }
  if(!item?.accessToken)throw new Error("Ce sous-compte GHL n’est pas autorisé dans Presty CRM");
  if(item.expiresAt&&new Date(item.expiresAt).getTime()>Date.now()+60000)return item.accessToken;
  if(!item.refreshToken)throw new Error("Le jeton GHL a expiré. Synchronisez de nouveau les sous-comptes depuis l’administration.");
  const refreshed=normalizeToken(await refreshAccessToken(item.refreshToken,"Location"),item);
  state.ghlOAuth={...(state.ghlOAuth||{}),installations:installs.map(x=>String(x.locationId)===String(locationId)?refreshed:x)};
  await saveState(state);return refreshed.accessToken;
}
export {REDIRECT_URI};
