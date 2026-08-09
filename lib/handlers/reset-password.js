import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/db";
import { hashPassword } from "@/lib/security";
import { authUserFromToken, updateAuthPassword } from "@/lib/supabase-auth";

export async function POST(request) {
  try {
    const { accessToken, password } = await request.json();
    if (!accessToken) return NextResponse.json({ error: "Lien de réinitialisation invalide." }, { status: 400 });
    if (String(password || "").length < 8) return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    const authUser = await authUserFromToken(accessToken);
    const email = authUser.email?.toLowerCase();
    const state = await loadState();
    const user = state.users.find((item) => item.authUserId === authUser.id || item.email?.toLowerCase() === email);
    if (!user) return NextResponse.json({ error: "Compte introuvable dans le portail." }, { status: 404 });
    await updateAuthPassword(authUser.id, password);
    await saveState({
      ...state,
      users: state.users.map((item) => item.id === user.id ? { ...item, authUserId: authUser.id, passwordHash: hashPassword(password), passwordUpdatedAt: new Date().toISOString() } : item),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Impossible de modifier le mot de passe." }, { status: 500 });
  }
}
