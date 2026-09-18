import {loadState,saveState} from "@/lib/db";
import {exchangeAuthorizationCode,normalizeToken} from "@/lib/ghl-oauth";
import crypto from "node:crypto";
export const dynamic="force-dynamic";
function esc(s){return String(s||"").replace(/[<&]/g,c=>c==="<"?"&lt;":"&amp;")}
// Empreinte courte non réversible, uniquement pour comparer deux tokens sans jamais
// afficher leur valeur réelle ni le refresh token.
function fingerprint(token){
  if(!token)return "(absent)";
  return crypto.createHash("sha256").update(String(token)).digest("hex").slice(0,12);
}
function popupResponse(origin,{ok,message}){
  const payload=JSON.stringify({type:"presty-ghl-oauth",ok:Boolean(ok),message:String(message||"")}).replace(/</g,"\\u003c");
  const fallback=ok?"/?ghl_connected=1":`/?ghl_error=${encodeURIComponent(message||"Connexion GHL impossible")}`;
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presty · GoHighLevel</title><style>body{font-family:Arial,sans-serif;background:#f5f7ff;color:#17191f;display:grid;place-items:center;min-height:100vh;margin:0}.box{background:#fff;border:1px solid #e6e8ef;border-radius:20px;padding:32px;max-width:560px;box-shadow:0 15px 50px rgba(20,30,70,.08)}h1{font-size:24px;margin:0 0 12px}p{color:#687084;line-height:1.5;white-space:pre-line}a{color:#2d45f9}</style></head><body><div class="box"><h1>${ok?"GoHighLevel connecté":"Connexion GoHighLevel incomplète"}</h1><p>${esc(message)}</p><p>Vous pouvez fermer cette fenêtre et revenir dans l’administration Presty.</p><a href="${fallback}">Retourner à Presty</a></div><script>try{if(window.opener&&!window.opener.closed){window.opener.postMessage(${payload},${JSON.stringify(origin)});setTimeout(()=>window.close(),700)}}catch(e){}</script></body></html>`;
  return new Response(html,{status:ok?200:400,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}
export async function GET(req){
  const url=new URL(req.url),code=url.searchParams.get("code"),error=url.searchParams.get("error")||url.searchParams.get("error_description"),returnedState=url.searchParams.get("state")||"",cookieState=req.cookies.get("presty_ghl_oauth_state")?.value||"";
  // [DIAGNOSTIC 1/7] Si ce texte s'affiche (succès ou échec), le callback Presty a
  // bien été atteint par HighLevel — la question 1 est donc réglée dans tous les cas.
  const DIAG_HEADER="[DIAGNOSTIC OAuth] (1) Callback atteint : OUI.";
  if(error)return popupResponse(url.origin,{ok:false,message:`${DIAG_HEADER} (2) Nouveau token reçu : NON — HighLevel a renvoyé une erreur avant tout échange : ${error}`});
  if(!cookieState||!returnedState||cookieState!==returnedState)return popupResponse(url.origin,{ok:false,message:`${DIAG_HEADER} (2) Nouveau token reçu : NON — état OAuth invalide ou expiré (cookie manquant ou différent du paramètre state). Relancez l’initialisation depuis Presty.`});
  if(!code)return popupResponse(url.origin,{ok:false,message:`${DIAG_HEADER} (2) Nouveau token reçu : NON — code OAuth GoHighLevel manquant dans la redirection.`});
  try{
    const token=normalizeToken(await exchangeAuthorizationCode(code));
    if(!token.accessToken)throw new Error(`(2) Nouveau token reçu : NON — GoHighLevel n’a pas renvoyé d’access token.`);
    if(String(token.userType||"").toLowerCase()!=="company")throw new Error(`(2) Nouveau token reçu : OUI mais type incorrect — HighLevel a renvoyé un token ${token.userType||"inconnu"} au lieu de Company.`);
    if(!token.companyId)throw new Error("(2) Nouveau token reçu : OUI mais sans companyId — token agence incomplet.");
    // [DIAGNOSTIC 2-3/7] Token reçu, avec sa date d'expiration et son empreinte.
    const receivedFp=fingerprint(token.accessToken);
    const state=await loadState();
    state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,agencyToken:{...token,userType:"Company"},installations:Array.isArray(state?.ghlOAuth?.installations)?state.ghlOAuth.installations:[],lastError:"",updatedAt:new Date().toISOString()};
    let saveOk=true,saveErrMsg="";
    try{await saveState(state,{allowGhlOAuthWrite:true})}catch(serr){saveOk=false;saveErrMsg=serr?.message||String(serr)}
    // [DIAGNOSTIC 5-6-7/7] Relecture immédiate, indépendante de tout cache navigateur
    // ou de window.opener : cette page HTML est générée après la relecture, donc ce
    // qu'elle affiche est la vérité de Supabase à cet instant précis.
    let rereadFp="(non tenté)",rereadExp="(non tenté)",rereadOk="(non tenté)";
    try{
      const reread=await loadState();
      const stored=reread?.ghlOAuth?.agencyToken;
      rereadFp=fingerprint(stored?.accessToken);
      rereadExp=stored?.expiresAt||"(absente)";
      rereadOk=(rereadFp===receivedFp)?"OUI, identique au token reçu":"NON — DIFFÉRENT du token reçu (le token relu n'est pas celui qu'on vient d'écrire)";
    }catch(verr){rereadOk=`relecture impossible : ${verr?.message||verr}`}
    const diag=[
      DIAG_HEADER,
      `(2) Nouveau token reçu : OUI — expiration=${token.expiresAt} — empreinte=${receivedFp}.`,
      `(3) Sauvegarde Supabase : ${saveOk?"RÉUSSIE (aucune exception)":`ÉCHEC — ${saveErrMsg}`}.`,
      `(4)(6) Relecture immédiate après sauvegarde : expiration relue=${rereadExp} — empreinte relue=${rereadFp}.`,
      `(7) Token relu = token reçu ? ${rereadOk}.`
    ].join(" ");
    return popupResponse(url.origin,{ok:true,message:`${diag} Revenez dans Presty (sans cliquer sur Rafraîchir pour l'instant) et copiez ce message en entier.`});
  }catch(e){
    try{const state=await loadState();state.ghlOAuth={...(state.ghlOAuth||{}),connected:Boolean(state?.ghlOAuth?.agencyToken?.accessToken),lastError:e.message||"Connexion GHL impossible",updatedAt:new Date().toISOString()};await saveState(state,{allowGhlOAuthWrite:true})}catch{}
    return popupResponse(url.origin,{ok:false,message:`${DIAG_HEADER} ${e.message||"Connexion GHL impossible"}`});
  }
}
