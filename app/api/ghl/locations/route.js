import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {loadState,saveState} from "@/lib/db";
import {getValidLocationToken,oauthInstallations,syncInstalledLocations} from "@/lib/ghl-oauth";
export const dynamic="force-dynamic";
async function locationDetails(state,item){
  try{const token=await getValidLocationToken(state,item.locationId,saveState);const r=await fetch(`https://services.leadconnectorhq.com/locations/${encodeURIComponent(item.locationId)}`,{headers:{Accept:"application/json",Authorization:`Bearer ${token}`,Version:"2021-07-28"},cache:"no-store"});const b=await r.json().catch(()=>({})),loc=b?.location||b;if(r.ok)return{id:item.locationId,name:loc?.name||loc?.companyName||item.locationName||item.locationId,address:[loc?.address,loc?.city].filter(Boolean).join(", "),companyId:item.companyId||"",userType:"Location"}}catch{}
  return{id:item.locationId,name:item.locationName||item.locationId,address:item.address||"",companyId:item.companyId||"",userType:"Location"};
}
export async function GET(){
  try{
    const sess=await getSession();if(!sess||sess.role!=="agency_admin")return NextResponse.json({error:"Réservé à l’administration Presty"},{status:403});
    const state=await loadState(),hasAgency=Boolean(state?.ghlOAuth?.agencyToken?.accessToken);
    if(!hasAgency)return NextResponse.json({connected:false,locations:[],syncError:state?.ghlOAuth?.lastError||"",needsAuthorization:true});
    let syncError="";try{await syncInstalledLocations(state,saveState)}catch(e){syncError=e.message||"";const freshErr=await loadState();freshErr.ghlOAuth={...(freshErr.ghlOAuth||{}),connected:true,lastError:syncError,updatedAt:new Date().toISOString()};await saveState(freshErr)}
    const fresh=await loadState(),installs=oauthInstallations(fresh).filter(x=>x.locationId&&x.isInstalled!==false),locations=[];
    for(const item of installs)locations.push(await locationDetails(fresh,item));
    return NextResponse.json({connected:true,locations,syncError:syncError||fresh?.ghlOAuth?.lastError||"",lastSyncAt:fresh?.ghlOAuth?.lastSyncAt||"",needsAuthorization:false});
  }catch(e){return NextResponse.json({error:e.message||"Impossible de charger les sous-comptes GHL"},{status:500})}
}
