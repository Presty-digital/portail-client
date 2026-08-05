export function supabaseConfig(){
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url&&key?{url,key}:null;
}
export function supabaseHeaders(key,extra={}){return {apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...extra}}
