const TOKEN_URL="https://services.leadconnectorhq.com/oauth/token";
const API_BASE="https://services.leadconnectorhq.com";
const REDIRECT_URI=process.env.GHL_REDIRECT_URI||"https://portail-client.presty-digital.fr/api/integrations/crm/callback";
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
  const raw=Array.isArray(body?.message)?body.message.join(", "):body?.message||body?.error_description||(typeof body?.error==="string"?body.error:body?.error?.message)||fallback||`Erreur HighLevel (${status})`;
  return String(raw||`Erreur HighLevel (${status})`);
}
function isInvalidRefreshTokenError(error){
  const msg=String(error?.message||error||"").toLowerCase();
  return msg.includes("refresh token")&&(msg.includes("invalid")||msg.includes("expired")||msg.includes("revoked"));
}
// Décodage NON VÉRIFIÉ (pas de contrôle de signature, juste lecture des claims)
// afin de voir ce que le JWT contient réellement — sans jamais exposer le token
// lui-même. Sert uniquement au diagnostic quand HighLevel répond "Invalid JWT".
function decodeJwtClaimsSafe(token){
  try{
    const parts=String(token||"").split(".");
    if(parts.length<2)return{ok:false,reason:`structure inattendue (${parts.length} segment(s) au lieu de 3)`};
    const b64=parts[1].replace(/-/g,"+").replace(/_/g,"/").padEnd(parts[1].length+(4-parts[1].length%4)%4,"=");
    const json=Buffer.from(b64,"base64").toString("utf8");
    const claims=JSON.parse(json);
    return{ok:true,claims};
  }catch(e){return{ok:false,reason:e?.message||"décodage impossible"}}
}
function tokenDiagnostic(agency){
  const usedAppId=appId();
  const usedVersionId=process.env.GHL_VERSION_ID||process.env.GHL_APP_VERSION_ID||process.env.GHL_APP_ID||"6a797b77d0061c571740aa09";
  const appIdSource=process.env.GHL_APP_ID?"GHL_APP_ID":(process.env.GHL_CLIENT_ID?"dérivé de GHL_CLIENT_ID":"VALEUR PAR DÉFAUT CODÉE EN DUR (aucune variable d'env détectée)");
  const d=decodeJwtClaimsSafe(agency?.accessToken);
  const appliedParams=`appId envoyé=${usedAppId} (source: ${appIdSource}); versionId envoyé=${usedVersionId}.`;
  if(!d.ok)return `JWT illisible côté Presty (${d.reason}) — le token stocké est probablement corrompu ou tronqué. ${appliedParams}`;
  const c=d.claims||{};
  const expAt=c.exp?new Date(c.exp*1000).toISOString():"absent";
  const expired=c.exp?(c.exp*1000<Date.now()):"inconnu";
  const innerCompanyId=c.authClassId||c.companyId||c.company_id||"absent";
  const innerAuthClass=c.authClass||"absent";
  const match=innerCompanyId&&agency?.companyId?String(innerCompanyId)===String(agency.companyId):"non vérifiable";
  return `JWT lisible : authClass=${innerAuthClass}; companyId interne au token=${innerCompanyId} (correspond à celui utilisé dans l'appel : ${match}); expiration=${expAt}; expiré=${expired}. ${appliedParams}`;
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
  return tokenRequest({client_id:clientId,client_secret:clientSecret,grant_type:"authorization_code",code:String(code||""),user_type:"Company",redirect_uri:REDIRECT_URI});
}
export async function refreshAccessToken(refreshToken,userType="Company"){
  const{clientId,clientSecret}=credentials();
  return tokenRequest({client_id:clientId,client_secret:clientSecret,grant_type:"refresh_token",refresh_token:String(refreshToken||""),user_type:String(userType||"Company")});
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
function scopeSet(token){return new Set(String(token?.scope||"").split(/\s+/).map(x=>x.trim()).filter(Boolean))}
function hasScopes(token,requiredScopes=[]){const have=scopeSet(token);return (requiredScopes||[]).every(scope=>have.has(scope))}
export function publicAgencyStatus(state){
  const t=state?.ghlOAuth?.agencyToken||{};
  return{connected:Boolean(t.accessToken),companyId:t.companyId||"",userType:t.userType||"",expiresAt:t.expiresAt||"",isBulkInstallation:Boolean(t.isBulkInstallation),installToFutureLocations:Boolean(t.installToFutureLocations),approveAllLocations:Boolean(t.approveAllLocations),approvedLocationsCount:Array.isArray(t.approvedLocations)?t.approvedLocations.length:0,credentialsConfigured:Boolean(process.env.GHL_CLIENT_ID&&process.env.GHL_CLIENT_SECRET),redirectUri:REDIRECT_URI,scopes:String(t.scope||"").split(/\s+/).filter(Boolean),oauthDiagnostic:state?.ghlOAuth?.oauthDiagnostic||""};
}
function currentAgencyToken(state){
  const item=state?.ghlOAuth?.agencyToken;
  if(!item?.accessToken)throw new Error("L’accès agence GoHighLevel n’a pas encore été initialisé dans Presty");
  if(String(item.userType||"").toLowerCase()!=="company")throw new Error("Le jeton GoHighLevel enregistré n’est pas un jeton agence (Company)");
  return item;
}
async function persistAgencyToken(token,state,saveState){
  // Toujours repartir du dernier état Supabase afin qu'une rotation OAuth ne soit
  // jamais écrasée par une copie ancienne du gros payload app_state.
  let target=state;
  try{const {loadState}=await import("@/lib/db");target=await loadState()}catch{}
  target.ghlOAuth={...(target.ghlOAuth||{}),connected:true,agencyToken:token,lastError:"",updatedAt:new Date().toISOString()};
  await saveState(target,{allowGhlOAuthWrite:true});
  state.ghlOAuth=target.ghlOAuth;
  return token;
}
async function rotateAgencyToken(state,saveState,failedAccessToken=""){
  // Relire AVANT toute rotation : un autre appel Vercel a peut-être déjà remplacé
  // le refresh token à usage unique pendant cette requête.
  let latestState=state;
  try{const {loadState}=await import("@/lib/db");latestState=await loadState()}catch{}
  let item=currentAgencyToken(latestState);
  if(failedAccessToken&&item.accessToken&&item.accessToken!==failedAccessToken){state.ghlOAuth=latestState.ghlOAuth;return item}
  if(!item.refreshToken)throw new Error("Le token agence GHL n’est plus renouvelable. Utilisez « Reconnecter GoHighLevel » une seule fois.");
  try{
    const rotated=normalizeToken(await refreshAccessToken(item.refreshToken,"Company"),item);
    return await persistAgencyToken(rotated,state,saveState);
  }catch(error){
    if(isInvalidRefreshTokenError(error)){
      try{
        const {loadState}=await import("@/lib/db");
        const fresh=await loadState();const newer=fresh?.ghlOAuth?.agencyToken;
        if(newer?.accessToken&&newer.accessToken!==item.accessToken){state.ghlOAuth=fresh.ghlOAuth;return newer}
      }catch{}
      throw new Error("L’autorisation agence HighLevel doit être renouvelée une fois. Utilisez « Reconnecter GoHighLevel », puis les prochains rafraîchissements seront automatiques.");
    }
    throw error;
  }
}
export async function getValidAgencyToken(state,saveState){
  // V21.27 : ne plus consommer préventivement le refresh token selon expiresAt.
  // L'access token courant est utilisé jusqu'à ce que HighLevel réponde réellement 401/403.
  return currentAgencyToken(state);
}
async function fetchInstalledLocations(agency){
  if(!agency.companyId)throw new Error("Le token agence GHL ne contient pas de companyId");
  // V21.31 — endpoint v3 actuellement documenté par HighLevel.
  // L'ancien /oauth/installedLocations a été retiré sans dépréciation d'après
  // le changelog HighLevel. On utilise donc /oauth/installed-locations avec
  // pageSize/pageToken et la forme de réponse v3 (items + pagination).
  const locations=[];
  let pageToken="";
  const seenTokens=new Set();
  for(let page=0;page<100;page+=1){
    const q=new URLSearchParams({
      companyId:String(agency.companyId),
      appId:appId(),
      isInstalled:"true",
      pageSize:"100"
    });
    const versionId=process.env.GHL_VERSION_ID||process.env.GHL_APP_VERSION_ID||process.env.GHL_APP_ID||"6a797b77d0061c571740aa09";
    if(versionId)q.set("versionId",String(versionId));
    if(pageToken)q.set("pageToken",pageToken);
    const r=await fetch(`${API_BASE}/oauth/installed-locations?${q}`,{
      headers:{Accept:"application/json",Authorization:`Bearer ${agency.accessToken}`,Version:"v3"},
      cache:"no-store"
    });
    const b=await parseJson(r);
    if(!r.ok)throw Object.assign(new Error(apiError(b,r.status,`Impossible de récupérer les sous-comptes installés (${r.status})`)),{status:r.status,details:b});
    const list=Array.isArray(b?.items)?b.items:[];
    locations.push(...list);
    const pagination=b?.pagination||{};
    const next=String(pagination?.nextPageToken||"");
    if(!pagination?.hasNextPage||!next||seenTokens.has(next))break;
    seenTokens.add(next);
    pageToken=next;
  }
  const unique=new Map();
  for(const loc of locations){
    const id=String(loc?._id||loc?.locationId||loc?.id||"");
    if(id&&!unique.has(id))unique.set(id,loc);
  }
  return [...unique.values()];
}

export async function getInstalledLocations(state,saveState){
  let agency=currentAgencyToken(state);
  try{return await fetchInstalledLocations(agency)}catch(e){
    if(e?.status===401){
      // Renouvellement automatique via le mécanisme existant rotateAgencyToken() —
      // même protection anti-concurrence (relecture Supabase, comparaison de
      // failedAccessToken) que celle déjà utilisée pour les tokens de sous-comptes.
      // Une seule rotation, un seul retry, pas de boucle.
      let rotated;
      try{
        rotated=await rotateAgencyToken(state,saveState,agency.accessToken);
      }catch(rotateErr){
        const scopes=[...scopeSet(agency)];
        throw new Error(`HighLevel refuse le token agence courant (401) sur /oauth/installed-locations, et le renouvellement automatique via le refresh token a échoué : ${rotateErr?.message||rotateErr}. userType=${agency.userType||"inconnu"}; oauth.readonly=${scopes.includes("oauth.readonly")?"oui":"non"}; companyId=${agency.companyId?"présent":"absent"}. ${tokenDiagnostic(agency)}`);
      }
      try{
        return await fetchInstalledLocations(rotated);
      }catch(e2){
        if(e2?.status===401)throw new Error(`Même après renouvellement automatique du token agence, HighLevel refuse toujours (401) /oauth/installed-locations. Détail HighLevel : ${e2.message||"(vide)"}. ${tokenDiagnostic(rotated)}`);
        if(e2?.status===403){
          const scopes=[...scopeSet(rotated)];
          throw new Error(`HighLevel interdit /oauth/installed-locations (403) après renouvellement du token. oauth.readonly=${scopes.includes("oauth.readonly")?"oui":"non"}. ${tokenDiagnostic(rotated)}`);
        }
        throw e2;
      }
    }
    if(e?.status===403){
      const scopes=[...scopeSet(agency)];
      throw new Error(`HighLevel interdit /oauth/installed-locations (403). oauth.readonly=${scopes.includes("oauth.readonly")?"oui":"non"}. Aucun token n’a été renouvelé. Détail HighLevel : ${e.message||"(vide)"}. ${tokenDiagnostic(agency)}`);
    }
    throw e;
  }
}
export async function exchangeLocationToken(state,locationId,saveState){
  let agency=currentAgencyToken(state);
  async function request(a){
    const r=await fetch(`${API_BASE}/oauth/location-token`,{
      method:"POST",headers:{Accept:"application/json",Authorization:`Bearer ${a.accessToken}`,Version:API_VERSION,"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({companyId:String(a.companyId),locationId:String(locationId)}),cache:"no-store"
    });
    const b=await parseJson(r);return{r,b};
  }
  let {r,b}=await request(agency);
  // V21.28: seul un 401 justifie une rotation du Company token.
  // Un 403 est une erreur de permission et ne doit jamais brûler le refresh token.
  if(r.status===401){
    agency=await rotateAgencyToken(state,saveState,agency.accessToken);
    ({r,b}=await request(agency));
  }
  if(!r.ok){
    const msg=apiError(b,r.status,`Impossible de créer le token du sous-compte (${r.status})`);
    if(r.status===401||r.status===403)throw new Error(`${msg}. Le scope oauth.write est requis dans HighLevel.`);
    throw new Error(msg);
  }
  return normalizeToken({...b,locationId,companyId:agency.companyId},{locationId,companyId:agency.companyId,userType:"Location"});
}
export async function syncInstalledLocations(state,saveState){
  // V21.28 — découverte et authentification Location sont volontairement séparées.
  // Le bouton "Rafraîchir les sous-comptes" doit UNIQUEMENT synchroniser les
  // installations GHL. Il ne génère/renouvelle aucun Location Token et ne peut
  // donc plus casser le Company refresh token lors de l'ajout d'un nouveau compte.
  const locations=await getInstalledLocations(state,saveState);
  let installs=oauthInstallations(state),seen=new Set();
  for(const loc of locations){
    const locationId=String(loc?.locationId||loc?._id||loc?.id||"");
    if(!locationId||loc?.isInstalled===false)continue;
    seen.add(locationId);
    const previous=installs.find(x=>String(x.locationId)===locationId)||{};
    const item={
      ...previous,
      locationId,
      locationName:(loc?.name&&String(loc.name)!==locationId?loc.name:"")||(loc?.locationName&&String(loc.locationName)!==locationId?loc.locationName:"")||(previous?.locationName&&String(previous.locationName)!==locationId?previous.locationName:"")||locationId,
      address:loc?.address||previous?.address||"",
      companyId:loc?.companyId||previous?.companyId||state?.ghlOAuth?.agencyToken?.companyId||"",
      isInstalled:true,
      discoveredAt:previous?.discoveredAt||new Date().toISOString()
    };
    installs=installs.some(x=>String(x.locationId)===locationId)
      ? installs.map(x=>String(x.locationId)===locationId?item:x)
      : [...installs,item];
  }
  // Une synchro réussie est la source de vérité : les installations absentes de
  // la réponse GHL sont marquées non installées. Même si la liste est vide, on
  // respecte la réponse de l'API au lieu de conserver des comptes fantômes.
  installs=installs.map(x=>seen.has(String(x.locationId))?x:{...x,isInstalled:false});
  state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,installations:installs,lastError:"",lastSyncAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await saveState(state,{allowGhlOAuthWrite:true});
  return installs.filter(x=>x.isInstalled!==false);
}
export async function getValidLocationToken(state,locationId,saveState,requiredScopes=[]){
  let installs=oauthInstallations(state),item=installs.find(x=>String(x.locationId)===String(locationId));
  const expired=Boolean(item?.expiresAt&&new Date(item.expiresAt).getTime()<=Date.now()+60000);
  // V21.25 : les refresh tokens HighLevel sont à usage unique. Pour les sous-comptes,
  // Presty ne les consomme plus : un token Location absent/expiré/incomplet est recréé
  // depuis le Company token. Cela évite les collisions entre plusieurs requêtes CRM.
  if((!item?.accessToken||expired||!hasScopes(item,requiredScopes))&&state?.ghlOAuth?.agencyToken){
    item=await exchangeLocationToken(state,locationId,saveState);
    installs=installs.some(x=>String(x.locationId)===String(locationId))?installs.map(x=>String(x.locationId)===String(locationId)?item:x):[...installs,item];
    state.ghlOAuth={...(state.ghlOAuth||{}),installations:installs,lastError:"",updatedAt:new Date().toISOString()};
    await saveState(state);
  }
  if(!item?.accessToken)throw new Error("Ce sous-compte GHL n’est pas autorisé dans Presty CRM");
  if(requiredScopes.length&&!hasScopes(item,requiredScopes))throw new Error(`Le token du sous-compte GHL ne contient pas le scope requis : ${requiredScopes.join(", ")}`);
  return item.accessToken;
}

export {REDIRECT_URI};
