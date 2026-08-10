const TOKEN_URL="https://services.leadconnectorhq.com/oauth/token";
const REDIRECT_URI="https://portail-client-brown.vercel.app/api/integrations/crm/callback";

function credentials(){
 const clientId=process.env.GHL_CLIENT_ID||"";
 const clientSecret=process.env.GHL_CLIENT_SECRET||"";
 if(!clientId||!clientSecret)throw new Error("GHL_CLIENT_ID / GHL_CLIENT_SECRET manquants");
 return {clientId,clientSecret};
}

async function tokenRequest(params){
 const response=await fetch(TOKEN_URL,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(params),cache:"no-store"});
 const body=await response.json().catch(()=>({}));
 if(!response.ok){const msg=Array.isArray(body?.message)?body.message.join(", "):body?.message||body?.error_description||body?.error||`Erreur OAuth GHL (${response.status})`;throw new Error(msg)}
 return body;
}

export async function exchangeAuthorizationCode(code){
 const {clientId,clientSecret}=credentials();
 return tokenRequest({client_id:clientId,client_secret:clientSecret,grant_type:"authorization_code",code:String(code||""),redirect_uri:REDIRECT_URI});
}

export async function refreshAccessToken(refreshToken,userType){
 const {clientId,clientSecret}=credentials();
 const params={client_id:clientId,client_secret:clientSecret,grant_type:"refresh_token",refresh_token:String(refreshToken||"")};
 if(userType)params.user_type=String(userType);
 return tokenRequest(params);
}

export function normalizeToken(body,previous={}){
 const expiresIn=Number(body?.expires_in||86400);
 return {
  locationId:String(body?.locationId||previous.locationId||""),
  companyId:String(body?.companyId||previous.companyId||""),
  userType:String(body?.userType||body?.user_type||previous.userType||"Location"),
  accessToken:String(body?.access_token||previous.accessToken||""),
  refreshToken:String(body?.refresh_token||previous.refreshToken||""),
  tokenType:String(body?.token_type||previous.tokenType||"Bearer"),
  scope:Array.isArray(body?.scope)?body.scope.join(" "):String(body?.scope||previous.scope||""),
  expiresAt:new Date(Date.now()+Math.max(60,expiresIn-120)*1000).toISOString(),
  updatedAt:new Date().toISOString(),
  installedAt:previous.installedAt||new Date().toISOString()
 };
}

export function oauthInstallations(state){return Array.isArray(state?.ghlOAuth?.installations)?state.ghlOAuth.installations:[]}

export async function getValidLocationToken(state,locationId,saveState){
 const installs=oauthInstallations(state);
 let item=installs.find(x=>String(x.locationId)===String(locationId));
 if(!item?.accessToken)throw new Error("Ce sous-compte GHL n’est pas autorisé dans Presty CRM");
 const stillValid=item.expiresAt&&new Date(item.expiresAt).getTime()>Date.now()+60000;
 if(stillValid)return item.accessToken;
 if(!item.refreshToken)throw new Error("Le jeton GHL a expiré et aucun refresh token n’est disponible. Réinstallez l’application sur ce sous-compte.");
 const refreshed=normalizeToken(await refreshAccessToken(item.refreshToken,item.userType),item);
 state.ghlOAuth={...(state.ghlOAuth||{}),installations:installs.map(x=>x===item?refreshed:x)};
 await saveState(state);
 return refreshed.accessToken;
}

export {REDIRECT_URI};
