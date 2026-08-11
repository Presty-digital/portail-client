import {NextResponse} from 'next/server';
import {metaFetch,requireMetaAccess,leadCount} from '@/lib/meta';

export const dynamic='force-dynamic';

const FIELDS='campaign_id,campaign_name,spend,impressions,reach,clicks,inline_link_clicks,actions,cpm,cpc,ctr';

function normalizeRows(data=[]){
  return (data||[]).map(x=>{
    const leads=leadCount(x.actions);
    const spend=Number(x.spend||0);
    return {
      campaignId:x.campaign_id,
      campaignName:x.campaign_name,
      spend,
      impressions:Number(x.impressions||0),
      reach:Number(x.reach||0),
      clicks:Number(x.clicks||0),
      linkClicks:Number(x.inline_link_clicks||0),
      leads,
      cpl:leads?spend/leads:0,
      cpm:Number(x.cpm||0),
      cpc:Number(x.cpc||0),
      ctr:Number(x.ctr||0)
    };
  });
}

function mergeRows(groups=[]){
  const map=new Map();
  for(const rows of groups){
    for(const row of rows){
      const key=row.campaignId||row.campaignName;
      const prev=map.get(key)||{...row,spend:0,impressions:0,reach:0,clicks:0,linkClicks:0,leads:0};
      prev.campaignName=row.campaignName||prev.campaignName;
      prev.spend+=Number(row.spend||0);
      prev.impressions+=Number(row.impressions||0);
      prev.reach+=Number(row.reach||0);
      prev.clicks+=Number(row.clicks||0);
      prev.linkClicks+=Number(row.linkClicks||0);
      prev.leads+=Number(row.leads||0);
      map.set(key,prev);
    }
  }
  return [...map.values()].map(x=>({
    ...x,
    cpl:x.leads?x.spend/x.leads:0,
    cpm:x.impressions?x.spend/x.impressions*1000:0,
    cpc:x.clicks?x.spend/x.clicks:0,
    ctr:x.impressions?x.clicks/x.impressions*100:0
  })).sort((a,b)=>b.spend-a.spend);
}

async function fetchPeriod(act,{since,until,preset}){
  const time_range=since&&until?JSON.stringify({since,until}):undefined;
  const j=await metaFetch(`${act}/insights`,{
    fields:FIELDS,
    level:'campaign',
    time_range,
    date_preset:time_range?undefined:(preset||'this_month'),
    limit:500
  });
  return normalizeRows(j.data||[]);
}

async function fetchMaximum(act){
  try{
    // Meta sait calculer directement la durée maximale disponible du compte.
    return await fetchPeriod(act,{preset:'maximum'});
  }catch(primaryError){
    // Fallback robuste : certaines configurations Meta refusent "maximum" sur
    // des comptes anciens. On découpe alors l'historique par années et on
    // additionne les campagnes, au lieu de retourner silencieusement 0 €.
    const now=new Date();
    const currentYear=now.getFullYear();
    const groups=[];
    let successful=0;
    let lastError=primaryError;
    for(let year=2020;year<=currentYear;year++){
      const since=`${year}-01-01`;
      const until=year===currentYear
        ? `${currentYear}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        : `${year}-12-31`;
      try{
        groups.push(await fetchPeriod(act,{since,until}));
        successful++;
      }catch(e){
        lastError=e;
      }
    }
    if(!successful)throw lastError;
    return mergeRows(groups);
  }
}

export async function GET(req){
  try{
    const q=new URL(req.url).searchParams;
    const institutId=q.get('institutId')||'';
    const accountId=q.get('accountId')||'';
    const since=q.get('since')||'';
    const until=q.get('until')||'';
    const preset=q.get('preset')||'';
    await requireMetaAccess(institutId);
    if(!accountId)return NextResponse.json({error:'Compte publicitaire manquant'},{status:400});
    const act=accountId.startsWith('act_')?accountId:`act_${accountId}`;
    const rows=preset==='maximum'
      ? await fetchMaximum(act)
      : await fetchPeriod(act,{since,until,preset:preset||'this_month'});
    const totals=rows.reduce((a,x)=>({
      spend:a.spend+x.spend,
      impressions:a.impressions+x.impressions,
      reach:a.reach+x.reach,
      clicks:a.clicks+x.clicks,
      linkClicks:a.linkClicks+x.linkClicks,
      leads:a.leads+x.leads
    }),{spend:0,impressions:0,reach:0,clicks:0,linkClicks:0,leads:0});
    totals.cpl=totals.leads?totals.spend/totals.leads:0;
    return NextResponse.json({rows,totals,period:preset==='maximum'?'maximum':{since,until}});
  }catch(e){
    return NextResponse.json({error:e.message},{status:e.status||500});
  }
}
