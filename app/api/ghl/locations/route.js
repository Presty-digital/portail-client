import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {loadState,saveState} from "@/lib/db";
import {getValidLocationToken,oauthInstallations} from "@/lib/ghl-oauth";
export const dynamic="force-dynamic";

async function locationDetails(state,item){
 if(!item.locationId)return {id:"",name:"Compte agence GHL",companyId:item.companyId||"",userType:item.userType||"Company"};
 try{
  const token=await getValidLocationToken(state,item.locationId,saveState);
  const r=await fetch(`https://services.leadconnectorhq.com/locations/${encodeURIComponent(item.locationId)}`,{headers:{Accept:"application/json",Authorization:`Bearer ${token}`,Version:"2021-07-28"},cache:"no-store"});
  const b=await r.json().catch(()=>({}));const loc=b?.location||b;
  if(r.ok)return {id:item.locationId,name:loc?.name||loc?.companyName||item.locationId,address:[loc?.address,loc?.city].filter(Boolean).join(", "),companyId:item.companyId||"",userType:item.userType||"Location"};
 }catch{}
 return {id:item.locationId,name:item.locationName||item.locationId,companyId:item.companyId||"",userType:item.userType||"Location"};
}

export async function GET(){
 try{const sess=await getSession();if(!sess||sess.role!=="agency_admin")return NextResponse.json({error:"Réservé à l’administration Presty"},{status:403});const state=await loadState();const installs=oauthInstallations(state);const locations=[];for(const item of installs){if(item.locationId)locations.push(await locationDetails(state,item))}return NextResponse.json({connected:Boolean(state.ghlOAuth?.connected),locations});}catch(e){return NextResponse.json({error:e.message||"Impossible de charger les sous-comptes GHL"},{status:500})}
}
