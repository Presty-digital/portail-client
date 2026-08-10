import {NextResponse} from 'next/server';import {metaFetch,normalizeAdAccount,requireMetaAccess} from '@/lib/meta';
export const dynamic='force-dynamic';
export async function GET(req){
  try{
    const institutId=new URL(req.url).searchParams.get('institutId')||'';
    await requireMetaAccess(institutId);
    const j=await metaFetch('me/adaccounts',{fields:'id,name,account_id,account_status,currency,timezone_name,business',limit:200});
    return NextResponse.json({accounts:(j.data||[]).map(normalizeAdAccount),diagnostic:{ok:true,graphVersion:process.env.META_GRAPH_VERSION||'v23.0',endpoint:'me/adaccounts',tokenConfigured:Boolean(process.env.META_ACCESS_TOKEN)}});
  }catch(e){
    const m=e?.meta||{};
    return NextResponse.json({
      error:e?.message||'Erreur Meta',
      details:{
        source:'Meta Graph API',
        httpStatus:e?.status||500,
        graphVersion:process.env.META_GRAPH_VERSION||'v23.0',
        endpoint:'me/adaccounts',
        tokenConfigured:Boolean(process.env.META_ACCESS_TOKEN),
        type:m.type||'',
        code:m.code??null,
        errorSubcode:m.error_subcode??null,
        errorUserTitle:m.error_user_title||'',
        errorUserMessage:m.error_user_msg||'',
        fbtraceId:m.fbtrace_id||'',
        isTransient:Boolean(m.is_transient),
        rawMessage:m.message||e?.message||''
      }
    },{status:e?.status||500});
  }
}
