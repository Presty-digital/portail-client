import crypto from "node:crypto";
import { config } from "./config";

const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminHeaders = () => {
  const { key } = config();
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
};

export async function findAuthUserByEmail(email) {
  const { url } = config();
  const response = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers: adminHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(`Supabase Auth: ${await response.text()}`);
  const body = await response.json();
  const users = Array.isArray(body?.users) ? body.users : Array.isArray(body) ? body : [];
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

export async function ensureAuthUser(email, password) {
  let existing = await findAuthUserByEmail(email);
  if (existing) return existing;
  const { url } = config();
  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password: password || crypto.randomBytes(32).toString("base64url"), email_confirm: true }),
  });
  if (!response.ok) throw new Error(`Supabase Auth: ${await response.text()}`);
  return response.json();
}

export async function sendRecoveryEmail(email, redirectTo) {
  const { url } = config();
  const key = anonKey();
  const response = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error(`Supabase Auth: ${await response.text()}`);
  return true;
}

export async function authUserFromToken(accessToken) {
  const { url } = config();
  const key = anonKey();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Lien de réinitialisation invalide ou expiré.");
  return response.json();
}

export async function updateAuthPassword(authUserId, password) {
  if (!authUserId) return;
  const { url } = config();
  const response = await fetch(`${url}/auth/v1/admin/users/${authUserId}`, {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error(`Supabase Auth: ${await response.text()}`);
}
