import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {loadState,saveState} from "@/lib/db";
import {hashPassword} from "@/lib/security";
import {ensureAuthUser,updateAuthPassword} from "@/lib/supabase-auth";
export async function POST(req){try{const sess=await getSession();if(sess?.role!=="agency_admin")return NextResponse.json({error:"Accès refusé"},{status:403});const {id,newPassword}=await req.json();if(String(newPassword||"").length<8)return NextResponse.json({error:"8 caractères minimum"},{status:400});const s=await loadState();const user=s.users.find(x=>x.id===id&&x.role!=="agency_admin");if(!user)return NextResponse.json({error:"Utilisateur introuvable"},{status:404});const authUser=user.authUserId?{id:user.authUserId}:await ensureAuthUser(user.email,newPassword);await updateAuthPassword(authUser.id,newPassword);await saveState({...s,users:s.users.map(x=>x.id===id?{...x,authUserId:authUser.id,passwordHash:hashPassword(newPassword),passwordUpdatedAt:new Date().toISOString()}:x)});return NextResponse.json({ok:true})}catch(e){return NextResponse.json({error:e.message||"Impossible de modifier le mot de passe"},{status:500})}}
