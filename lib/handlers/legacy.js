import {NextResponse} from "next/server";
export async function GET(){return NextResponse.json({ok:true,message:"Cette route historique est conservée pour compatibilité V7."})}
export async function POST(){return NextResponse.json({error:"Utilisez l’interface V7."},{status:410})}
export async function PUT(){return NextResponse.json({error:"Utilisez l’interface V7."},{status:410})}
export async function PATCH(){return NextResponse.json({error:"Utilisez l’interface V7."},{status:410})}
export async function DELETE(){return NextResponse.json({error:"Utilisez l’interface V7."},{status:410})}
