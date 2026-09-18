import {loadState,saveState} from "@/lib/db";
import {exchangeAuthorizationCode,normalizeToken} from "@/lib/ghl-oauth";
export const dynamic="force-dynamic";
function esc(s){return String(s||"").replace(/[<&]/g,c=>c==="<"?"&lt;":"&amp;")}
function popupResponse(origin,{ok,message}){
  const payload=JSON.stringify({type:"presty-ghl-oauth",ok:Boolean(ok),message:String(message||"")}).replace(/</g,"\\u003c");
  const fallback=ok?"/?ghl_connected=1":`/?ghl_error=${encodeURIComponent(message||"Connexion GHL impossible")}`;
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presty · GoHighLevel</title><style>body{font-family:Arial,sans-serif;background:#f5f7ff;color:#17191f;display:grid;place-items:center;min-height:100vh;margin:0}.box{background:#fff;border:1px solid #e6e8ef;border-radius:20px;padding:32px;max-width:560px;box-shadow:0 15px 50px rgba(20,30,70,.08)}h1{font-size:24px;margin:0 0 12px}p{color:#687084;line-height:1.5}a{color:#2d45f9}</style></head><body><div class="box"><h1>${ok?"GoHighLevel connecté":"Connexion GoHighLevel incomplète"}</h1><p>${esc(message)}</p><p>Vous pouvez fermer cette fenêtre et revenir dans l’administration Presty.</p><a href="${fallback}">Retourner à Presty</a></div><script>try{if(window.opener&&!window.opener.closed){window.opener.postMessage(${payload},${JSON.stringify(origin)});setTimeout(()=>window.close(),700)}}catch(e){}</script></body></html>`;
  return new Response(html,{status:ok?200:400,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}
// Diagnostic silencieux, conservé en base pour un futur dépannage — n'affecte
// jamais le comportement OAuth ni ce que voit l'utilisateur dans la popup.
async function persistDiagnostic(text){
  try{
    const state=await loadState();
    state.ghlOAuth={...(state.ghlOAuth||{}),oauthDiagnostic:text,oauthDiagnosticAt:new Date().toISOString()};
    await saveState(state,{allowGhlOAuthWrite:true});
  }catch{}
}
export async function GET(req){
  const url=new URL(req.url),code=url.searchParams.get("code"),error=url.searchParams.get("error")||url.searchParams.get("error_description"),returnedState=url.searchParams.get("state")||"",cookieState=req.cookies.get("presty_ghl_oauth_state")?.value||"";
  if(error){await persistDiagnostic(`Callback atteint. Erreur HighLevel avant échange : ${error}`);return popupResponse(url.origin,{ok:false,message:error})}
  if(!cookieState||!returnedState||cookieState!==returnedState){await persistDiagnostic("Callback atteint. État OAuth invalide ou expiré (cookie manquant ou différent du paramètre state).");return popupResponse(url.origin,{ok:false,message:"État OAuth invalide ou expiré. Relancez l’initialisation depuis Presty."})}
  if(!code){await persistDiagnostic("Callback atteint. Code OAuth manquant dans la redirection.");return popupResponse(url.origin,{ok:false,message:"Code OAuth GoHighLevel manquant"})}
  try{
    const token=normalizeToken(await exchangeAuthorizationCode(code));
    if(!token.accessToken)throw new Error("GoHighLevel n’a pas renvoyé d’access token");
    if(String(token.userType||"").toLowerCase()!=="company")throw new Error(`HighLevel a renvoyé un token ${token.userType||"inconnu"}. Pour l’architecture Presty, l’installation doit être effectuée par l’agence afin d’obtenir un token Company unique.`);
    if(!token.companyId)throw new Error("Le token agence HighLevel ne contient pas de companyId");
    const state=await loadState();
    state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,agencyToken:{...token,userType:"Company"},installations:Array.isArray(state?.ghlOAuth?.installations)?state.ghlOAuth.installations:[],lastError:"",oauthDiagnostic:"",updatedAt:new Date().toISOString()};
    await saveState(state,{allowGhlOAuthWrite:true});
    return popupResponse(url.origin,{ok:true,message:"Accès agence GoHighLevel renouvelé. Revenez dans Presty puis cliquez une seule fois sur « Rafraîchir les sous-comptes » pour récupérer toutes les installations."});
  }catch(e){
    await persistDiagnostic(`Callback atteint. Échec de l’échange/renouvellement : ${e.message||"Connexion GHL impossible"}`);
    try{const state=await loadState();state.ghlOAuth={...(state.ghlOAuth||{}),connected:Boolean(state?.ghlOAuth?.agencyToken?.accessToken),lastError:e.message||"Connexion GHL impossible",updatedAt:new Date().toISOString()};await saveState(state,{allowGhlOAuthWrite:true})}catch{}
    return popupResponse(url.origin,{ok:false,message:e.message||"Connexion GHL impossible"});
  }
}
