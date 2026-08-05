import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/db";
import { hashPassword, signSession, cookieName } from "@/lib/security";
import { uid } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadState();
    return NextResponse.json({ initialized: state.initialized });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Erreur d’initialisation" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const state = await loadState();
    if (state.initialized || state.users.some((user) => user.role === "agency_admin")) {
      return NextResponse.json({ error: "Le compte administrateur existe déjà." }, { status: 409 });
    }
    const body = await request.json();
    const name = String(body.name || "Administrateur Presty").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Saisissez une adresse email valide." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    const user = { id: uid(), name, email, passwordHash: hashPassword(password), role: "agency_admin", institutId: null, active: true, createdAt: new Date().toISOString() };
    await saveState({ ...state, initialized: true, users: [user, ...state.users] });
    const response = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    response.cookies.set(cookieName(), signSession({ userId: user.id, role: user.role, institutId: null, exp: Date.now() + 604800000 }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 604800 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Impossible de créer le compte administrateur." }, { status: 500 });
  }
}
