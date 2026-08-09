import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/security";
import { ensureAuthUser, updateAuthPassword } from "@/lib/supabase-auth";

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
    const { currentPassword, newPassword } = await request.json();
    if (String(newPassword || "").length < 8) return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    const state = await loadState();
    const user = state.users.find((item) => item.id === session.userId && item.active !== false);
    if (!user || !verifyPassword(currentPassword || "", user.passwordHash)) return NextResponse.json({ error: "Le mot de passe actuel est incorrect." }, { status: 400 });
    const authUser = user.authUserId ? { id: user.authUserId } : await ensureAuthUser(user.email, newPassword);
    await updateAuthPassword(authUser.id, newPassword);
    await saveState({ ...state, users: state.users.map((item) => item.id === user.id ? { ...item, authUserId: authUser.id, passwordHash: hashPassword(newPassword), passwordUpdatedAt: new Date().toISOString() } : item) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Impossible de modifier le mot de passe." }, { status: 500 });
  }
}
