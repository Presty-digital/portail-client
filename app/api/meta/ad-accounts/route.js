import {NextResponse} from 'next/server';import {metaFetch,normalizeAdAccount,requireMetaAccess} from '@/lib/meta';
export const dynamic='force-dynamic';
export async function GET(req){try{const institutId=new URL(req.url).searchParams.get('institutId')||'';await requireMetaAccess(institutId);const j=await metaFetch('me/adaccounts',{fields:'id,name,account_id,account_status,currency,timezone_name,business',limit:200});return NextResponse.json({accounts:(j.data||[]).map(normalizeAdAccount)});}catch(e){return NextResponse.json({error:e.message},{status:e.status||500})}}
