export const CURRENT_VERSION=6;
export const STATE_ID="presty-main";
export const CATEGORIES=["Minceur","Visage","Épilation","Autres"];
export const STATUTS=["Non qualifié","Appel 1","Appel 2","RDV fixé","Client converti","Perdu"];
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
export const today=()=>new Date().toISOString().slice(0,10);
export const emptyState=()=>({version:CURRENT_VERSION,initialized:false,users:[],instituts:[],campaigns:[],leads:[],expenses:[],reviews:[]});
const arr=v=>Array.isArray(v)?v:[];
export function migrate(raw){
 const b=emptyState(); if(!raw||typeof raw!=="object")return b;
 const out={...b,...raw,version:CURRENT_VERSION};
 out.users=arr(raw.users);out.instituts=arr(raw.instituts);out.campaigns=arr(raw.campaigns);out.leads=arr(raw.leads);out.expenses=arr(raw.expenses||raw.spend);out.reviews=arr(raw.reviews);
 out.initialized=Boolean(raw.initialized||out.users.some(x=>x.role==="agency_admin"));
 return out;
}
