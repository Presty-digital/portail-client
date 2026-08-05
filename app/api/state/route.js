import { NextResponse } from 'next/server';
import { authProfile, loadState, saveState } from '@/lib/server';
import { scopedState } from '@/lib/state';
export async function GET(req){try{const p=await authProfile(req);if(!p)return NextResponse.json({error:'Non autorisé'},{status:401});const s=await loadState();return NextResponse.json({profile:p,state:scopedState(s,p)});}catch(e){return NextResponse.json({error:e.message},{status:500});}}
export async function PUT(req){try{const p=await authProfile(req);if(!p)return NextResponse.json({error:'Non autorisé'},{status:401});const body=await req.json();const current=await loadState();if(p.role==='agency_admin')return NextResponse.json({state:await saveState(body.state)});
const id=p.institut_id;const incoming=body.state||{};const next={...current,
 leads:[...current.leads.filter(x=>x.institutId!==id),...(incoming.leads||[]).filter(x=>x.institutId===id)],
};
return NextResponse.json({state:scopedState(await saveState(next),p)});
}catch(e){return NextResponse.json({error:e.message},{status:500});}}
