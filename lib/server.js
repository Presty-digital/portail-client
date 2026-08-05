import {NextResponse} from "next/server";import {getSession} from "./session";import {loadState,saveState} from "./db";
export async function requireAdmin(){const s=await getSession();if(s?.role!=="agency_admin")throw new Error("Accès administrateur requis");return s}
export const apiError=e=>NextResponse.json({error:e?.message||"Erreur"},{status:500});
export async function countAdmins(){const s=await loadState();return s.users.filter(x=>x.role==="agency_admin").length}
export async function insertProfile(){return null}
