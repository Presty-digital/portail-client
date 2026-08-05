'use client';
import{createContext,useContext,useEffect,useState,ReactNode}from'react';import{getStoredSession,refreshSession,signOut}from'@/lib/browser-auth';import{api}from'@/lib/client-api';import type{SessionUser}from'@/lib/server-auth';
type C={user:SessionUser|null;loading:boolean;logout:()=>Promise<void>};const Ctx=createContext<C>({user:null,loading:true,logout:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}){const[user,setUser]=useState<SessionUser|null>(null);const[loading,setLoading]=useState(true);useEffect(()=>{(async()=>{try{const s=await refreshSession();if(s){const d=await api<{user:SessionUser}>('/api/auth/profile');setUser(d.user)}}catch{}finally{setLoading(false)}})()},[]);return <Ctx.Provider value={{user,loading,logout:async()=>{signOut();location.href='/login'}}}>{children}</Ctx.Provider>}
export const useAuth=()=>useContext(Ctx);
