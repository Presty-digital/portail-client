import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
export const dynamic="force-dynamic";
const DEFAULT_INSTALL_URL="https://app.gohighlevel.com/integration/6a797b77d0061c571740aa09/versions/6a797b77d0061c571740aa09";
export async function GET(req){const sess=await getSession();if(!sess||sess.role!=="agency_admin")return NextResponse.json({error:"Réservé à l’administration Presty"},{status:403});const target=process.env.GHL_INSTALL_URL||DEFAULT_INSTALL_URL;return NextResponse.redirect(target)}
