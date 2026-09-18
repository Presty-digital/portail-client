import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {loadState,saveState} from "@/lib/db";
import {oauthInstallations,syncInstalledLocations,publicAgencyStatus} from "@/lib/ghl-oauth";
export const dynamic="force-dynamic";
// V21.28: /oauth/installed-locations fournit déjà le nom et l’adresse.
// Ne jamais générer de Location Token simplement pour afficher la liste admin.
function usefulName(value,id){
  const v=String(value||"").trim();
  return v&&v!==String(id||"")?v:"";
}
function historicalName(state,item){
  const id=String(item.locationId||"");
  // Ne jamais perdre un nom métier déjà connu dans les attributions client.
  // Les versions 21.29-21.31 ont pu écrire l'ID comme locationName : on l'ignore.
  const integration=(state.integrations||[]).find(x=>x?.provider==="ghl"&&String(x?.locationId||"")===id&&usefulName(x?.locationName,id));
  if(integration)return usefulName(integration.locationName,id);
  return "";
}
function locationDetails(state,item){
  const id=String(item.locationId||"");
  const name=usefulName(item.name,id)||usefulName(item.locationName,id)||historicalName(state,item)||id;
  return {id,name,address:item.address||"",companyId:item.companyId||"",userType:"Location"};
}
export async function GET(req){
  try{
    const sess=await getSession();if(!sess||sess.role!=="agency_admin")return NextResponse.json({error:"Réservé à l’administration Presty"},{status:403});
    const state=await loadState(),status=publicAgencyStatus(state);
    if(!status.connected)return NextResponse.json({connected:false,locations:[],syncError:state?.ghlOAuth?.lastError||"",needsAuthorization:true,status});
    const url=new URL(req.url),doSync=url.searchParams.get("sync")==="1";
    let syncError="";
    if(doSync){try{await syncInstalledLocations(state,saveState)}catch(e){syncError=e.message||"";const freshErr=await loadState();freshErr.ghlOAuth={...(freshErr.ghlOAuth||{}),connected:true,lastError:syncError,updatedAt:new Date().toISOString()};await saveState(freshErr,{allowGhlOAuthWrite:true})}}
    const fresh=await loadState(),installs=oauthInstallations(fresh).filter(x=>x.locationId&&x.isInstalled!==false),locations=[];
    for(const item of installs)locations.push(locationDetails(fresh,item));
    return NextResponse.json({connected:true,locations,syncError:syncError||fresh?.ghlOAuth?.lastError||"",lastSyncAt:fresh?.ghlOAuth?.lastSyncAt||"",needsAuthorization:false,status:publicAgencyStatus(fresh)});
  }catch(e){return NextResponse.json({error:e.message||"Impossible de charger les sous-comptes GHL"},{status:500})}
}
