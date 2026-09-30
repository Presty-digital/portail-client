import {NextResponse} from "next/server";
import {getSession,allowedIds} from "@/lib/session";
import {loadState,saveState} from "@/lib/db";
import {getValidLocationToken,exchangeLocationToken,persistLocationToken} from "@/lib/ghl-oauth";
export const dynamic="force-dynamic";

function canAccess(sess,institutId){if(sess?.role==="agency_admin")return true;return (allowedIds(sess)||[]).includes(institutId)}
function extractForms(body){const raw=Array.isArray(body)?body:(Array.isArray(body?.forms)?body.forms:Array.isArray(body?.data)?body.data:[]);return raw.map(x=>({id:String(x.id||x.formId||x._id||""),name:String(x.name||x.title||x.formName||"Formulaire GHL"),locationId:String(x.locationId||"")})).filter(x=>x.id)}
function errorMessage(body,status){const raw=Array.isArray(body?.message)?body.message.join(", "):body?.message||body?.error_description||(typeof body?.error==="string"?body.error:body?.error?.message);return String(raw||`Erreur HighLevel (${status})`)}
async function fetchFormsPage(token,locationId,skip=0){
 const url=new URL("https://services.leadconnectorhq.com/forms/");url.searchParams.set("locationId",locationId);url.searchParams.set("skip",String(skip));url.searchParams.set("limit","50");
 const response=await fetch(url,{headers:{Accept:"application/json",Authorization:`Bearer ${token}`,Version:"v3"},cache:"no-store"});
 const body=await response.json().catch(()=>({}));return{response,body};
}

export async function GET(req){
 try{
  const sess=await getSession();if(!sess)return NextResponse.json({error:"Non autorisé"},{status:401});
  const institutId=new URL(req.url).searchParams.get("institutId")||"";if(!institutId||!canAccess(sess,institutId))return NextResponse.json({error:"Accès refusé"},{status:403});
  const state=await loadState();const integration=(state.integrations||[]).find(x=>x.institutId===institutId&&x.provider==="ghl");
  if(!integration?.locationId)return NextResponse.json({error:"Aucun sous-compte GHL attribué à ce client par l’administration Presty"},{status:400});

  // V21.44.4 — le listing des formulaires exige explicitement forms.readonly.
  // Cela force la régénération d'un ancien Location Token mis en cache avant l'ajout de ce scope.
  let token=await getValidLocationToken(state,integration.locationId,saveState,["forms.readonly"]);
  let first=await fetchFormsPage(token,integration.locationId,0);

  // Si HighLevel invalide un Location Token encore considéré valide localement,
  // on le recrée une seule fois depuis le Company token puis on rejoue la requête.
  if(first.response.status===401||first.response.status===403){
   const fresh=await exchangeLocationToken(state,integration.locationId,saveState);
   await persistLocationToken(state,integration.locationId,fresh,saveState);
   const scopes=new Set(String(fresh?.scope||"").split(/\s+/).filter(Boolean));
   if(!scopes.has("forms.readonly"))return NextResponse.json({error:"L’autorisation GoHighLevel actuelle ne contient pas le scope forms.readonly. Reconnectez GoHighLevel une seule fois depuis l’administration Presty."},{status:403});
   token=fresh.accessToken;first=await fetchFormsPage(token,integration.locationId,0);
  }
  if(!first.response.ok)return NextResponse.json({error:errorMessage(first.body,first.response.status)},{status:first.response.status});

  // L'API GHL limite une page à 50 formulaires. On récupère toutes les pages.
  let forms=extractForms(first.body),total=Number(first.body?.total||forms.length),skip=50;
  while(skip<total){const page=await fetchFormsPage(token,integration.locationId,skip);if(!page.response.ok)return NextResponse.json({error:errorMessage(page.body,page.response.status)},{status:page.response.status});forms.push(...extractForms(page.body));skip+=50}
  const unique=[...new Map(forms.map(f=>[f.id,f])).values()];
  return NextResponse.json({forms:unique,locationId:integration.locationId});
 }catch(e){return NextResponse.json({error:String(e?.message||e||"Erreur de synchronisation GHL")},{status:500})}
}
