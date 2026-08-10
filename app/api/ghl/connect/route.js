import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import crypto from "node:crypto";

export const dynamic="force-dynamic";

const AUTHORIZE_URL="https://marketplace.gohighlevel.com/oauth/chooselocation";
const DEFAULT_REDIRECT_URI="https://portail-client-brown.vercel.app/api/integrations/crm/callback";
const DEFAULT_SCOPES=[
  "locations.readonly",
  "forms.readonly",
  "contacts.readonly",
  "contacts.write",
  "opportunities.readonly",
  "opportunities.write",
  "pipelines.readonly",
  "oauth.readonly",
  "oauth.write"
].join(" ");

export async function GET(req){
  const sess=await getSession();
  if(!sess||sess.role!=="agency_admin")return NextResponse.json({error:"Réservé à l’administration Presty"},{status:403});
  const clientId=process.env.GHL_CLIENT_ID||"";
  if(!clientId)return NextResponse.json({error:"GHL_CLIENT_ID manquant côté serveur"},{status:500});
  const redirectUri=process.env.GHL_REDIRECT_URI||DEFAULT_REDIRECT_URI;
  const scopes=(process.env.GHL_SCOPES||DEFAULT_SCOPES).trim();
  const state=crypto.randomBytes(24).toString("hex");
  const target=new URL(AUTHORIZE_URL);
  target.searchParams.set("response_type","code");
  target.searchParams.set("client_id",clientId);
  target.searchParams.set("redirect_uri",redirectUri);
  target.searchParams.set("scope",scopes);
  target.searchParams.set("state",state);
  const res=NextResponse.redirect(target);
  res.cookies.set("presty_ghl_oauth_state",state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});
  return res;
}
