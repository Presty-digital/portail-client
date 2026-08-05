import crypto from "node:crypto";
export const STATE_ID="presty-main";
export const CATEGORIES=["Minceur","Visage","Épilation","Autres"];
export const STATUTS=["Non qualifié","Appel 1","Appel 2","RDV fixé","Client converti","Perdu"];
export const uid=()=>crypto.randomUUID();
export const today=()=>new Date().toISOString().slice(0,10);
export function emptyState(){return {version:5,initialized:false,users:[],instituts:[],leads:[],campaigns:[],expenses:[],reviews:[],settings:{brand:"Presty",categories:CATEGORIES}}}
export function migrate(raw){
  const base=emptyState(); if(!raw||typeof raw!=="object") return base;
  return {...base,...raw,version:5,users:Array.isArray(raw.users)?raw.users:[],instituts:Array.isArray(raw.instituts)?raw.instituts:[],leads:(raw.leads||[]).map(l=>({id:l.id||uid(),institutId:l.institutId||l.institut_id||"",dateContact:l.dateContact||l.date_contact||today(),prenom:l.prenom||"",nom:l.nom||"",telephone:l.telephone||"",email:l.email||"",source:l.source||"GHL",category:l.category||"Autres",campaignId:l.campaignId||"",typeSoin:l.typeSoin||l.type_soin||"",problematique:l.problematique||"",statut:l.statut||"Non qualifié",creneauRdv:l.creneauRdv||l.creneau_rdv||"",presence:l.presence||"",converted:l.converted??(l.convertit_patient==="Oui"||l.converti==="Oui"),value:Number(l.value??l.valeur_client??0),notes:l.notes||"",createdAt:l.createdAt||new Date().toISOString()})),campaigns:Array.isArray(raw.campaigns)?raw.campaigns:[],expenses:Array.isArray(raw.expenses)?raw.expenses:[],reviews:Array.isArray(raw.reviews)?raw.reviews:[],settings:{...base.settings,...(raw.settings||{})}};
}
