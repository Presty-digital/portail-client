import {NextResponse} from "next/server";
import {loadState} from "@/lib/db";
import {getSession} from "@/lib/session";
export const dynamic="force-dynamic";
export async function GET(req){
 try{
  const session=await getSession();
  if(!session)return NextResponse.json({error:"Non autorisé"},{status:401});
  if(session.role!=="agency_admin")return NextResponse.json({error:"Réservé à l’administration Presty"},{status:403});
  const state=await loadState();const url=new URL(req.url);const id=url.searchParams.get('id')||'';
  const all=Array.isArray(state.ghlDiagnostics)?state.ghlDiagnostics:[];
  const diagnostics=id?all.filter(x=>String(x.id)===id):all;
  return NextResponse.json({ok:true,count:diagnostics.length,diagnostics},{headers:{"Cache-Control":"no-store"}})
 }catch(e){return NextResponse.json({error:e?.message||String(e)},{status:500})}
}
