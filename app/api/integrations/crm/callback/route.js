import {NextResponse} from "next/server";
import {loadState,saveState} from "@/lib/db";
import {exchangeAuthorizationCode,normalizeToken,oauthInstallations} from "@/lib/ghl-oauth";
export const dynamic="force-dynamic";

export async function GET(req){
 const url=new URL(req.url);const code=url.searchParams.get("code");const error=url.searchParams.get("error");
 if(error)return NextResponse.redirect(new URL(`/?ghl_error=${encodeURIComponent(error)}`,url.origin));
 if(!code)return NextResponse.json({error:"Code OAuth GoHighLevel manquant"},{status:400});
 try{
  const token=normalizeToken(await exchangeAuthorizationCode(code));
  if(!token.accessToken)return NextResponse.json({error:"GoHighLevel n’a pas renvoyé d’access token"},{status:502});
  const state=await loadState();const installs=oauthInstallations(state);
  const key=x=>String(x.locationId||x.companyId||"");const tokenKey=key(token);
  const next=tokenKey&&installs.some(x=>key(x)===tokenKey)?installs.map(x=>key(x)===tokenKey?{...x,...token}:x):[...installs,token];
  state.ghlOAuth={...(state.ghlOAuth||{}),connected:true,updatedAt:new Date().toISOString(),installations:next};
  await saveState(state);
  return NextResponse.redirect(new URL(`/?ghl_connected=1${token.locationId?`&ghl_location=${encodeURIComponent(token.locationId)}`:""}`,url.origin));
 }catch(e){return NextResponse.redirect(new URL(`/?ghl_error=${encodeURIComponent(e.message||"Connexion GHL impossible")}`,url.origin))}
}
