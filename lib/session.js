import {cookies} from "next/headers";
import {cookieName,readSessionValue} from "./security";
export async function getSession(){const store=await cookies();return readSessionValue(store.get(cookieName())?.value||"")}
export function visibleState(state,session){if(!session)return null;if(session.role==="agency_admin")return state;const iid=session.institutId;return {...state,users:[],instituts:state.instituts.filter(x=>x.id===iid),leads:state.leads.filter(x=>x.institutId===iid),campaigns:state.campaigns.filter(x=>x.institutId===iid),expenses:state.expenses.filter(x=>x.institutId===iid),reviews:state.reviews.filter(x=>x.institutId===iid)} }
