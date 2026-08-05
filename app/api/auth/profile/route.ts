import {NextRequest,NextResponse} from 'next/server';import {getSessionUser} from '@/lib/server-auth';
export async function GET(req:NextRequest){const user=await getSessionUser(req);return user?NextResponse.json({user}):NextResponse.json({error:'Non connecté'},{status:401})}
