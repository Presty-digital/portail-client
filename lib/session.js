import {cookies} from "next/headers";import {cookieName,parseSession} from "./security";
export async function getSession(){const c=await cookies();return parseSession(c.get(cookieName())?.value||"")}
export function visibleState(s,session){if(session.role==="agency_admin")return s;const id=session.institutId;return{...s,users:[],instituts:s.instituts.filter(x=>x.id===id),campaigns:s.campaigns.filter(x=>x.institutId===id),leads:s.leads.filter(x=>x.institutId===id),expenses:s.expenses.filter(x=>x.institutId===id),reviews:s.reviews.filter(x=>x.institutId===id)}}
