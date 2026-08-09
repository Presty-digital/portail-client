import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/db";
import { ensureAuthUser, sendRecoveryEmail } from "@/lib/supabase-auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Saisissez une adresse email valide." }, { status: 400 });
    const state = await loadState();
    const user = state.users.find((item) => item.email?.toLowerCase() === email && item.active !== false);
    if (user) {
      const authUser = await ensureAuthUser(email);
      if (user.authUserId !== authUser.id) {
        await saveState({ ...state, users: state.users.map((item) => item.id === user.id ? { ...item, authUserId: authUser.id } : item) });
      }
      const origin = new URL(request.url).origin;
      await sendRecoveryEmail(email, `${origin}/reset-password`);
    }
    return NextResponse.json({ ok: true, message: "Si ce compte existe, un email de réinitialisation vient d’être envoyé." });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Impossible d’envoyer l’email de réinitialisation." }, { status: 500 });
  }
}
