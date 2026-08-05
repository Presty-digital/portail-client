'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '@/lib/supabase';
export default function AuthGate({children}) {
 const [ready,setReady]=useState(false); const router=useRouter();
 useEffect(()=>{browserSupabase().auth.getSession().then(({data})=>{if(!data.session) router.replace('/login'); else setReady(true);});},[router]);
 if(!ready) return <div className="centerScreen"><div className="spinner"/></div>;
 return children;
}
