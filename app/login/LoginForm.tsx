"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
export default function LoginForm(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false); const router=useRouter();
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");const supabase=createClient();const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setError("Identifiants incorrects.");setLoading(false);return;}router.push("/auth/callback");router.refresh();}
 return <form onSubmit={submit}><div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" /></div><div className="field"><label>Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" /></div><button className="btn" style={{width:"100%"}} disabled={loading}>{loading?"Connexion…":"Se connecter"}</button>{error&&<div className="error">{error}</div>}</form>
}
