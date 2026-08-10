import {loadState,saveState} from "@/lib/db";
import {exchangeAuthorizationCode,normalizeToken,oauthInstallations,syncInstalledLocations} from "@/lib/ghl-oauth";
export const dynamic="force-dynamic";
function popupResponse(origin,{ok,message}){
  const payload=JSON.stringify({type:"presty-ghl-oauth",ok:Boolean(ok),message:String(message||"")}).replace(/</g,"\\u003c");
  const fallback=ok?"/?ghl_connected=1":`/?ghl_error=${encodeURIComponent(message||"Connexion GHL impossible")}`;
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presty · GoHighLevel</title><style>body{font-family:Arial,sans-serif;background:#f5f7ff;color:#17191f;display:grid;place-items:center;min-height:100vh;margin:0}.box{background:#fff;border:1px solid #e6e8ef;border-radius:20px;padding:32px;max-width:520px;box-shadow:0 15px 50px rgba(20,30,70,.08)}h1{font-size:24px;margin:0 0 12px}p{color:#687084;line-height:1.5}a{color:#2d45f9}</style></head><body><div class="box"><h1>${ok?"GoHighLevel connecté":"Connexion GoHighLevel incomplète"}</h1><p>${String(message||"").replace(/[<&]/g,s=>s==="<"?"&lt;":"&amp;")}</p><p>Vous pouvez fermer cette fenêtre et revenir dans l’administration Presty.</p><a href="${fallback}">Retourner à Presty</a></div><script>try{if(window.opener&&!window.opener.closed){window.opener.postMessage(${payload},${JSON.stringify(origin)});setTimeout(()=>window.close(),500)}}catch(e){}</script></body></html>`;
  return new Response(html,{status:ok?200:400,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}
export async function GET(req){
  const url=new URL(req.url),code=url.searchParams.get("code"),error=url.searchParams.get("error");
  if(error)return popupResponse(url.origin,{ok:false,message:error});
  if(!code)return popupResponse(url.origin,{ok:false,message:"Code OAuth GoHighLevel manquant"});
  try{
    const token=normalizeToken(await exchangeAuthorizationCode(code));
    if(!token.accessToken)throw new Error("GoHighLevel n’a pas renvoyé d’access token");
    const state=await loadState();
    if(token.userType.toLowerCase()==="company"||!token.locationId){
      state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,agencyToken:{...token,userType:"Company"},lastError:"",updatedAt:new Date().toISOString()};
      await saveState(state);
      try{await syncInstalledLocations(state,saveState)}catch(syncError){
        const fresh=await loadState();fresh.ghlOAuth={...(fresh.ghlOAuth||{}),connected:true,lastError:syncError.message||"La connexion agence est active mais la synchronisation des sous-comptes a échoué",updatedAt:new Date().toISOString()};await saveState(fresh);
        return popupResponse(url.origin,{ok:true,message:`Compte agence connecté. Synchronisation des sous-comptes à relancer depuis Presty : ${syncError.message||"erreur inconnue"}`});
      }
    }else{
      const installs=oauthInstallations(state),next=installs.some(x=>String(x.locationId)===token.locationId)?installs.map(x=>String(x.locationId)===token.locationId?{...x,...token,isInstalled:true}:x):[...installs,{...token,isInstalled:true}];
      state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,installations:next,lastError:"",updatedAt:new Date().toISOString()};await saveState(state);
    }
    return popupResponse(url.origin,{ok:true,message:"Connexion OAuth enregistrée. Les sous-comptes autorisés sont maintenant disponibles dans l’administration Presty."});
  }catch(e){
    try{const state=await loadState();state.ghlOAuth={...(state.ghlOAuth||{}),lastError:e.message||"Connexion GHL impossible",updatedAt:new Date().toISOString()};await saveState(state)}catch{}
    return popupResponse(url.origin,{ok:false,message:e.message||"Connexion GHL impossible"});
  }
}
