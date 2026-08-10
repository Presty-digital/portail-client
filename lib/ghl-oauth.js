const TOKEN_URL="https://services.leadconnectorhq.com/oauth/token";
const API_BASE="https://services.leadconnectorhq.com";
const REDIRECT_URI=process.env.GHL_REDIRECT_URI||"https://portail-client-brown.vercel.app/api/integrations/crm/callback";
const API_VERSION="v3";

function credentials(){
  const clientId=process.env.GHL_CLIENT_ID||"",clientSecret=process.env.GHL_CLIENT_SECRET||"";
  if(!clientId||!clientSecret)throw new Error("GHL_CLIENT_ID / GHL_CLIENT_SECRET manquants");
  return{clientId,clientSecret};
}
export function appId(){
  return process.env.GHL_APP_ID||String(process.env.GHL_CLIENT_ID||"").split("-")[0]||"6a797b77d0061c571740aa09";
}
function apiError(body,status,fallback){
  const raw=Array.isArray(body?.message)?body.message.join(", "):body?.message||body?.error_description||body?.error||fallback||`Erreur HighLevel (${status})`;
  return String(raw||`Erreur HighLevel (${status})`);
}
async function tokenRequest(params){
  const response=await fetch(TOKEN_URL,{
    method:"POST",
    headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded",Version:API_VERSION},
    body:new URLSearchParams(params),
    cache:"no-store"
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(apiError(body,response.status,`Erreur OAuth GHL (${response.status})`));
  return body;
}
export async function exchangeAuthorizationCode(code){
  const{clientId,clientSecret}=credentials();
  return tokenRequest({clientId,clientSecret,grantType:"authorization_code",code:String(code||""),userType:"Company",redirectUri:REDIRECT_URI});
}
export async function refreshAccessToken(refreshToken,userType="Company"){
  const{clientId,clientSecret}=credentials();
  return tokenRequest({clientId,clientSecret,grantType:"refresh_token",refreshToken:String(refreshToken||""),userType:String(userType||"Company"),redirectUri:REDIRECT_URI});
}
export function normalizeToken(body,previous={}){
  const expiresIn=Number(body?.expiresIn||body?.expires_in||86400);
  return{
    locationId:String(body?.locationId||previous.locationId||""),
    companyId:String(body?.companyId||previous.companyId||""),
    userId:String(body?.userId||previous.userId||""),
    userType:String(body?.userType||body?.user_type||previous.userType||"Location"),
    accessToken:String(body?.accessToken||body?.access_token||previous.accessToken||""),
    refreshToken:String(body?.refreshToken||body?.refresh_token||previous.refreshToken||""),
    tokenType:String(body?.tokenType||body?.token_type||previous.tokenType||"Bearer"),
    scope:Array.isArray(body?.scope)?body.scope.join(" "):String(body?.scope||previous.scope||""),
    approvedLocations:Array.isArray(body?.approvedLocations)?body.approvedLocations:(previous.approvedLocations||[]),
    isBulkInstallation:Boolean(body?.isBulkInstallation??previous.isBulkInstallation),
    installToFutureLocations:Boolean(body?.installToFutureLocations??previous.installToFutureLocations),
    approveAllLocations:Boolean(body?.approveAllLocations??previous.approveAllLocations),
    expiresAt:new Date(Date.now()+Math.max(60,expiresIn-120)*1000).toISOString(),
    updatedAt:new Date().toISOString(),
    installedAt:previous.installedAt||new Date().toISOString()
  };
}
export function oauthInstallations(state){return Array.isArray(state?.ghlOAuth?.installations)?state.ghlOAuth.installations:[]}
export async function getValidAgencyToken(state,saveState){
  let item=state?.ghlOAuth?.agencyToken;
  if(!item?.accessToken)throw new Error("GoHighLevel n’est pas encore connecté au niveau agence");
  if(item.expiresAt&&new Date(item.expiresAt).getTime()>Date.now()+60000)return item;
  if(!item.refreshToken)throw new Error("Le token agence GHL a expiré. Reconnectez GoHighLevel.");
  item=normalizeToken(await refreshAccessToken(item.refreshToken,"Company"),item);
  state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,agencyToken:item,lastError:"",updatedAt:new Date().toISOString()};
  await saveState(state);
  return item;
}
export async function getInstalledLocations(state,saveState){
  const agency=await getValidAgencyToken(state,saveState),id=appId();
  if(!agency.companyId)throw new Error("Le token agence GHL ne contient pas de companyId");
  const q=new URLSearchParams({companyId:agency.companyId,appId:id,limit:"200"});
  const r=await fetch(`${API_BASE}/oauth/installed-locations?${q}`,{
    headers:{Accept:"application/json",Authorization:`Bearer ${agency.accessToken}`,Version:API_VERSION},cache:"no-store"
  });
  const b=await r.json().catch(()=>({}));
  if(!r.ok){
    const msg=apiError(b,r.status,`Impossible de récupérer les sous-comptes installés (${r.status})`);
    if(r.status===401||r.status===403)throw new Error(`${msg}. Vérifiez que oauth.readonly est bien autorisé dans la version HighLevel installée.`);
    throw new Error(msg);
  }
  const list=b?.locations||b?.data?.locations||b?.data||b?.items||b?.results||[];
  return Array.isArray(list)?list:[];
}
export async function exchangeLocationToken(state,locationId,saveState){
  const agency=await getValidAgencyToken(state,saveState);
  const r=await fetch(`${API_BASE}/oauth/location-token`,{
    method:"POST",
    headers:{Accept:"application/json",Authorization:`Bearer ${agency.accessToken}`,Version:API_VERSION,"Content-Type":"application/json"},
    body:JSON.stringify({companyId:agency.companyId,locationId:String(locationId)}),cache:"no-store"
  });
  const b=await r.json().catch(()=>({}));
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
    seen.add(locationId);
    let item=installs.find(x=>String(x.locationId)===locationId);
    if(!item?.accessToken)item=await exchangeLocationToken(state,locationId,saveState);
    item={...item,locationId,locationName:loc?.name||loc?.locationName||item.locationName||locationId,address:loc?.address||item.address||"",isInstalled:loc?.isInstalled!==false};
    installs=installs.some(x=>String(x.locationId)===locationId)?installs.map(x=>String(x.locationId)===locationId?item:x):[...installs,item];
  }
  installs=installs.map(x=>seen.size&& !seen.has(String(x.locationId))?{...x,isInstalled:false}:x);
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
