import {NextResponse} from "next/server";
import {getSession,allowedIds} from "@/lib/session";
import {loadState,saveState} from "@/lib/db";
import {getValidLocationToken} from "@/lib/ghl-oauth";
export const dynamic="force-dynamic";

function canAccess(sess,institutId){if(sess?.role==="agency_admin")return true;return (allowedIds(sess)||[]).includes(institutId)}
function extractForms(body){const raw=Array.isArray(body)?body:(Array.isArray(body?.forms)?body.forms:Array.isArray(body?.data)?body.data:[]);return raw.map(x=>({id:String(x.id||x.formId||x._id||""),name:String(x.name||x.title||x.formName||"Formulaire GHL"),locationId:String(x.locationId||"")})).filter(x=>x.id)}

export async function GET(req){
 try{
  const sess=await getSession();if(!sess)return NextResponse.json({error:"Non autorisé"},{status:401});
  const institutId=new URL(req.url).searchParams.get("institutId")||"";if(!institutId||!canAccess(sess,institutId))return NextResponse.json({error:"Accès refusé"},{status:403});
  const state=await loadState();const integration=(state.integrations||[]).find(x=>x.institutId===institutId&&x.provider==="ghl");
  if(!integration?.locationId)return NextResponse.json({error:"Aucun sous-compte GHL attribué à ce client par l’administration Presty"},{status:400});
  const token=await getValidLocationToken(state,integration.locationId,saveState);
  const url=new URL("https://services.leadconnectorhq.com/forms/");url.searchParams.set("locationId",integration.locationId);
  const response=await fetch(url,{headers:{Accept:"application/json",Authorization:`Bearer ${token}`,Version:"v3"},cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){const msg=Array.isArray(body?.message)?body.message.join(", "):body?.message||body?.error||`Erreur GHL (${response.status})`;return NextResponse.json({error:msg},{status:response.status})}
  return NextResponse.json({forms:extractForms(body),locationId:integration.locationId});
 }catch(e){return NextResponse.json({error:e.message||"Erreur de synchronisation GHL"},{status:500})}
}
