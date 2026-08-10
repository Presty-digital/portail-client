import {NextResponse} from "next/server";
export async function PUT(){return NextResponse.json({error:"Les tokens GHL manuels ne sont plus utilisés. La connexion est gérée par OAuth au niveau agence."},{status:410})}
