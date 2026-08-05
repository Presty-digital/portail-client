'use client';import{refreshSession}from'./browser-auth';
export async function token(){return(await refreshSession())?.access_token||''}
export async function api<T=unknown>(url:string,init:RequestInit={}):Promise<T>{const t=await token();const r=await fetch(url,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`,...(init.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Erreur');return j}
