import {NextRequest} from 'next/server';import {authUser} from './supabase';import type {Role} from './types';
export type SessionUser={id:string;email:string;role:Role;institutId:string|null};
export async function getSessionUser(req:NextRequest):Promise<SessionUser|null>{const token=req.headers.get('authorization')?.replace(/^Bearer\s+/,'');if(!token)return null;const user=await authUser(token);if(!user)return null;const meta=user.app_metadata||{};return{id:user.id,email:user.email||'',role:meta.role as Role,institutId:meta.institut_id||null}}
export async function requireUser(req:NextRequest,role?:Role){const user=await getSessionUser(req);if(!user)throw new Error('UNAUTHORIZED');if(role&&user.role!==role)throw new Error('FORBIDDEN');return user}
