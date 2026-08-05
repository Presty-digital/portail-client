import crypto from "node:crypto";
const COOKIE="presty_session";const secret=()=>process.env.APP_SESSION_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||"change-me";
export function hashPassword(password,salt=crypto.randomBytes(16).toString("hex")){return`${salt}:${crypto.scryptSync(password,salt,64).toString("hex")}`}
export function verifyPassword(password,stored=""){const [salt,hash]=stored.split(":");if(!salt||!hash)return false;const a=crypto.scryptSync(password,salt,64),b=Buffer.from(hash,"hex");return a.length===b.length&&crypto.timingSafeEqual(a,b)}
export function signSession(data){const body=Buffer.from(JSON.stringify(data)).toString("base64url");const sig=crypto.createHmac("sha256",secret()).update(body).digest("base64url");return`${body}.${sig}`}
export function parseSession(value=""){try{const [body,sig]=value.split(".");const exp=crypto.createHmac("sha256",secret()).update(body).digest("base64url");if(!sig||sig.length!==exp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp)))return null;const d=JSON.parse(Buffer.from(body,"base64url").toString());return d.exp>Date.now()?d:null}catch{return null}}
export const cookieName=()=>COOKIE;
