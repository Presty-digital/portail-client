import {loadState,saveState} from "@/lib/db";
import {exchangeAuthorizationCode,normalizeToken,syncInstalledLocations} from "@/lib/ghl-oauth";
export const dynamic="force-dynamic";
function esc(s){return String(s||"").replace(/[<&]/g,c=>c==="<"?"&lt;":"&amp;")}
function popupResponse(origin,{ok,message}){
  const payload=JSON.stringify({type:"presty-ghl-oauth",ok:Boolean(ok),message:String(message||"")}).replace(/</g,"\\u003c");
  const fallback=ok?"/?ghl_connected=1":`/?ghl_error=${encodeURIComponent(message||"Connexion GHL impossible")}`;
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presty · GoHighLevel</title><style>body{font-family:Arial,sans-serif;background:#f5f7ff;color:#17191f;display:grid;place-items:center;min-height:100vh;margin:0}.box{background:#fff;border:1px solid #e6e8ef;border-radius:20px;padding:32px;max-width:560px;box-shadow:0 15px 50px rgba(20,30,70,.08)}h1{font-size:24px;margin:0 0 12px}p{color:#687084;line-height:1.5}a{color:#2d45f9}</style></head><body><div class="box"><h1>${ok?"GoHighLevel connecté":"Connexion GoHighLevel incomplète"}</h1><p>${esc(message)}</p><p>Vous pouvez fermer cette fenêtre et revenir dans l’administration Presty.</p><a href="${fallback}">Retourner à Presty</a></div><script>try{if(window.opener&&!window.opener.closed){window.opener.postMessage(${payload},${JSON.stringify(origin)});setTimeout(()=>window.close(),700)}}catch(e){}</script></body></html>`;
  return new Response(html,{status:ok?200:400,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}
export async function GET(req){
  const url=new URL(req.url),code=url.searchParams.get("code"),error=url.searchParams.get("error")||url.searchParams.get("error_description"),returnedState=url.searchParams.get("state")||"",cookieState=req.cookies.get("presty_ghl_oauth_state")?.value||"";
  if(error)return popupResponse(url.origin,{ok:false,message:error});
  if(!cookieState||!returnedState||cookieState!==returnedState)return popupResponse(url.origin,{ok:false,message:"État OAuth invalide ou expiré. Relancez l’initialisation depuis Presty."});
  if(!code)return popupResponse(url.origin,{ok:false,message:"Code OAuth GoHighLevel manquant"});
  try{
    const token=normalizeToken(await exchangeAuthorizationCode(code));
    if(!token.accessToken)throw new Error("GoHighLevel n’a pas renvoyé d’access token");
    if(String(token.userType||"").toLowerCase()!=="company")throw new Error(`HighLevel a renvoyé un token ${token.userType||"inconnu"}. Pour l’architecture Presty, l’installation doit être effectuée par l’agence afin d’obtenir un token Company unique.`);
    if(!token.companyId)throw new Error("Le token agence HighLevel ne contient pas de companyId");
    const state=await loadState();
    state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,agencyToken:{...token,userType:"Company"},lastError:"",updatedAt:new Date().toISOString()};
    await saveState(state);
    let count=0,syncWarning="";
    try{count=(await syncInstalledLocations(state,saveState)).length}catch(e){syncWarning=e.message||"Synchronisation à relancer";const fresh=await loadState();fresh.ghlOAuth={...(fresh.ghlOAuth||{}),connected:true,lastError:syncWarning,updatedAt:new Date().toISOString()};await saveState(fresh)}
    return popupResponse(url.origin,{ok:true,message:syncWarning?`Accès agence sécurisé enregistré. La synchronisation automatique a signalé : ${syncWarning}. Revenez dans Presty puis cliquez sur « Rafraîchir les sous-comptes ».`:`Accès agence sécurisé enregistré. ${count} sous-compte${count>1?"s":""} disponible${count>1?"s":""} dans Presty.`});
  }catch(e){
    try{const state=await loadState();state.ghlOAuth={...(state.ghlOAuth||{}),connected:Boolean(state?.ghlOAuth?.agencyToken?.accessToken),lastError:e.message||"Connexion GHL impossible",updatedAt:new Date().toISOString()};await saveState(state)}catch{}
    return popupResponse(url.origin,{ok:false,message:e.message||"Connexion GHL impossible"});
  }
}
