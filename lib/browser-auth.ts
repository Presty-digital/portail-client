'use client';
const KEY='presty_session';
const cfg=()=>({url:process.env.NEXT_PUBLIC_SUPABASE_URL||'',key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''});
export type StoredSession={access_token:string;refresh_token:string;expires_at:number;user:any};
export function getStoredSession():StoredSession|null{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
export function saveSession(s:any){localStorage.setItem(KEY,JSON.stringify({...s,expires_at:Date.now()+Number(s.expires_in||3600)*1000}))}
export async function signIn(email:string,password:string){const{url,key}=cfg();const r=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const j=await r.json();if(!r.ok)throw new Error(j.error_description||j.msg||'Connexion impossible');saveSession(j);return j}
export async function refreshSession(){const s=getStoredSession();if(!s)return null;if(s.expires_at>Date.now()+60000)return s;const{url,key}=cfg();const r=await fetch(`${url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!r.ok){localStorage.removeItem(KEY);return null}const j=await r.json();saveSession(j);return getStoredSession()}
export function signOut(){localStorage.removeItem(KEY)}
