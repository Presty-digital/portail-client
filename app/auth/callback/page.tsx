import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export default async function Callback(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");const {data:profile}=await supabase.from("profiles").select("role").single();redirect(profile?.role==="agency_admin"?"/agence":"/dashboard");}
