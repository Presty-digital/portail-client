import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import crypto from "node:crypto";

export const dynamic="force-dynamic";

const AUTHORIZE_URL="https://marketplace.gohighlevel.com/v2/oauth/chooselocation";
const DEFAULT_REDIRECT_URI="https://portail-client.presty-digital.fr/api/integrations/crm/callback";
const DEFAULT_SCOPES=[
  "locations.readonly",
  "locations/customFields.readonly",
  "forms.readonly",
  "contacts.readonly",
  "contacts.write",
  "opportunities.readonly",
  "opportunities.write",
  "pipelines.readonly",
  "oauth.readonly",
  "oauth.write"
].join(" ");

function oauthTarget(){
  const clientId=process.env.GHL_CLIENT_ID||"";
  if(!clientId)throw new Error("GHL_CLIENT_ID manquant côté serveur");
  const redirectUri=process.env.GHL_REDIRECT_URI||DEFAULT_REDIRECT_URI;
  const versionId=process.env.GHL_VERSION_ID||process.env.GHL_APP_VERSION_ID||process.env.GHL_APP_ID||String(clientId).split("-")[0];
  if(!versionId)throw new Error("GHL_VERSION_ID / GHL_APP_ID manquant côté serveur");
  const scopes=(process.env.GHL_SCOPES||DEFAULT_SCOPES).trim();
  const state=crypto.randomBytes(24).toString("hex");
  const target=new URL(AUTHORIZE_URL);
  target.searchParams.set("response_type","code");
  target.searchParams.set("client_id",clientId);
  target.searchParams.set("redirect_uri",redirectUri);
  target.searchParams.set("scope",scopes);
  target.searchParams.set("version_id",versionId);
  target.searchParams.set("state",state);
  return {target,state};
}

export async function GET(req){
  const sess=await getSession();
  if(!sess||sess.role!=="agency_admin")return NextResponse.json({error:"Réservé à l’administration Presty"},{status:403});
  try{
    const {target,state}=oauthTarget();
    // Depuis l'interface, on prépare l'URL via fetch afin que la session admin
    // soit validée dans la fenêtre principale avant d'ouvrir HighLevel.
    const wantsJson=new URL(req.url).searchParams.get("mode")==="json";
    const res=wantsJson?NextResponse.json({ok:true,url:target.toString()}):NextResponse.redirect(target);
    res.cookies.set("presty_ghl_oauth_state",state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});
    return res;
  }catch(e){
    return NextResponse.json({error:e.message||"Impossible d'initialiser GoHighLevel"},{status:500});
  }
}
