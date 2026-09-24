import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {loadState} from "@/lib/db";
import {backfillLeadBatch} from "@/lib/crm-shadow";
import {config,headers} from "@/lib/config";
export const dynamic="force-dynamic";

async function admin(){const s=await getSession();return s?.role==="agency_admin"?s:null}
async function count(table){const {url}=config();const r=await fetch(`${url}/rest/v1/${table}?select=id`,{headers:headers({Prefer:"count=exact",Range:"0-0"}),cache:"no-store"});if(!r.ok)return null;const cr=r.headers.get("content-range")||"";const m=cr.match(/\/(\d+)$/);return m?Number(m[1]):null}

export async function GET(){
  if(!await admin())return NextResponse.json({error:"Accès refusé"},{status:403});
  const state=await loadState();
  const [contacts,appointments,actions]=await Promise.all([count("crm_contacts"),count("crm_appointments"),count("crm_actions")]);
  return NextResponse.json({ok:true,sourceLeads:(state.leads||[]).length,shadow:{contacts,appointments,actions},message:"Lecture uniquement. POST pour lancer le backfill contrôlé."});
}

export async function POST(req){
  if(!await admin())return NextResponse.json({error:"Accès refusé"},{status:403});
  try{
    const body=await req.json().catch(()=>({}));
    const offset=Math.max(0,Number(body.offset)||0);
    const limit=Math.min(100,Math.max(10,Number(body.limit)||50));
    const state=await loadState();
    const leads=Array.isArray(state.leads)?state.leads:[];
    const batch=leads.slice(offset,offset+limit);
    if(batch.length)await backfillLeadBatch(batch);
    const nextOffset=offset+batch.length;
    return NextResponse.json({ok:true,total:leads.length,processed:batch.length,offset,nextOffset,done:nextOffset>=leads.length});
  }catch(e){return NextResponse.json({error:e?.message||"Backfill impossible"},{status:500})}
}
