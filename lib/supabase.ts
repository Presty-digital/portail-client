export const serverConfig=()=>({url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY});
export async function adminListUsers(){return{data:{users:[]},error:null}}
export async function adminCreateUser(){return{data:{user:null},error:null}}
export async function authUser(){return null}
export const adminSupabase={auth:{admin:{updateUserById:async()=>({data:{},error:null})}}};
