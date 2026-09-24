import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {loadState} from "@/lib/db";
import {backfillLeadBatch,appointmentRows,actionRows,stable} from "@/lib/crm-shadow";
import {config,headers} from "@/lib/config";
export const dynamic="force-dynamic";

async function admin(){const s=await getSession();return s?.role==="agency_admin"?s:null}
async function count(table){const {url}=config();const r=await fetch(`${url}/rest/v1/${table}?select=id`,{headers:headers({Prefer:"count=exact",Range:"0-0"}),cache:"no-store"});if(!r.ok)return null;const cr=r.headers.get("content-range")||"";const m=cr.match(/\/(\d+)$/);return m?Number(m[1]):null}
async function allRows(table,select="id,data,contact_id"){
  const {url}=config();let out=[];
  for(let from=0;;from+=500){const to=from+499;const r=await fetch(`${url}/rest/v1/${table}?select=${select}`,{headers:headers({Range:`${from}-${to}`}),cache:"no-store"});if(!r.ok)throw new Error(`${table}: ${await r.text()}`);const rows=await r.json();out.push(...rows);if(rows.length<500)break}
  return out;
}
function comparableProjected(row){return {id:row.id,contact_id:row.contact_id,data:row.data}}
async function integrity(state){
  const leads=Array.isArray(state.leads)?state.leads:[];
  const [contacts,appointments,actions]=await Promise.all([allRows("crm_contacts","id,data"),allRows("crm_appointments"),allRows("crm_actions")]);
  const source=new Map(leads.map(l=>[String(l.id),l]));const shadow=new Map(contacts.map(r=>[String(r.id),r.data]));
  const missing=[];const mismatched=[];const orphan=[];
  for(const [id,lead] of source){if(!shadow.has(id))missing.push(id);else if(stable(lead)!==stable(shadow.get(id)))mismatched.push(id)}
  for(const id of shadow.keys())if(!source.has(id))orphan.push(id);
  const expectedAppointments=leads.flatMap(appointmentRows).map(comparableProjected);const expectedActions=leads.flatMap(actionRows).map(comparableProjected);
  const actualAppointments=appointments.map(comparableProjected);const actualActions=actions.map(comparableProjected);
  const compare=(expected,actual)=>{const e=new Map(expected.map(r=>[r.id,r])),a=new Map(actual.map(r=>[r.id,r]));const miss=[],diff=[],extra=[];for(const [id,row] of e){if(!a.has(id))miss.push(id);else if(stable(row)!==stable(a.get(id)))diff.push(id)}for(const id of a.keys())if(!e.has(id))extra.push(id);return {expected:expected.length,actual:actual.length,missing:miss.length,mismatched:diff.length,extra:extra.length,samples:{missing:miss.slice(0,10),mismatched:diff.slice(0,10),extra:extra.slice(0,10)}}};
  const ap=compare(expectedAppointments,actualAppointments),ac=compare(expectedActions,actualActions);
  const contactsOk=!missing.length&&!mismatched.length&&!orphan.length&&contacts.length===leads.length;
  return {ok:contactsOk&&!ap.missing&&!ap.mismatched&&!ap.extra&&!ac.missing&&!ac.mismatched&&!ac.extra,sourceLeads:leads.length,contacts:{actual:contacts.length,missing:missing.length,mismatched:mismatched.length,orphan:orphan.length,samples:{missing:missing.slice(0,10),mismatched:mismatched.slice(0,10),orphan:orphan.slice(0,10)}},appointments:ap,actions:ac,auditLogs:"Journal futur uniquement : aucune donnée historique artificielle n'est créée."};
}

export async function GET(req){
  if(!await admin())return NextResponse.json({error:"Accès refusé"},{status:403});
  const state=await loadState();const audit=new URL(req.url).searchParams.get("audit")==="1";
  if(audit){try{return NextResponse.json(await integrity(state))}catch(e){return NextResponse.json({error:e?.message||"Audit impossible"},{status:500})}}
  const [contacts,appointments,actions]=await Promise.all([count("crm_contacts"),count("crm_appointments"),count("crm_actions")]);
  return NextResponse.json({ok:true,sourceLeads:(state.leads||[]).length,shadow:{contacts,appointments,actions},message:"Lecture uniquement. POST pour lancer le backfill contrôlé. Ajouter ?audit=1 pour vérifier l'intégrité complète."});
}

export async function POST(req){
  if(!await admin())return NextResponse.json({error:"Accès refusé"},{status:403});
  try{
    const body=await req.json().catch(()=>({}));
    const limit=Math.min(100,Math.max(10,Number(body.limit)||50));
    const state=await loadState();
    const leads=Array.isArray(state.leads)?state.leads:[];

    // HOT mode: never rely on an array offset. The CRM is live and leads may be
    // appended/edited while migration is running. Each pass compares the current
    // authoritative lead with its shadow copy and only repairs missing/stale rows.
    if(body.mode==="catchup"){
      const contacts=await allRows("crm_contacts","id,data");
      const shadow=new Map(contacts.map(r=>[String(r.id),r.data]));
      const pending=leads.filter(lead=>!shadow.has(String(lead.id))||stable(lead)!==stable(shadow.get(String(lead.id))));
      const batch=pending.slice(0,limit);
      if(batch.length)await backfillLeadBatch(batch);
      return NextResponse.json({
        ok:true,mode:"catchup",sourceLeads:leads.length,processed:batch.length,
        pendingAtStart:pending.length,remainingAtSnapshot:Math.max(0,pending.length-batch.length),
        doneForSnapshot:pending.length<=batch.length,
        message:"Relancer catchup jusqu'à remainingAtSnapshot=0, puis lancer l'audit complet. Les nouveaux leads restent pris en charge au passage suivant."
      });
    }

    // Legacy offset mode kept for compatibility, but catchup is required for a live CRM.
    const offset=Math.max(0,Number(body.offset)||0);
    const batch=leads.slice(offset,offset+limit);
    if(batch.length)await backfillLeadBatch(batch);
    const nextOffset=offset+batch.length;
    return NextResponse.json({ok:true,total:leads.length,processed:batch.length,offset,nextOffset,done:nextOffset>=leads.length,warning:"CRM live: utiliser mode=catchup pour la migration complète."});
  }catch(e){return NextResponse.json({error:e?.message||"Backfill impossible"},{status:500})}
}
