import crypto from "node:crypto";
const COOKIE="presty_session";
const secret=()=>process.env.APP_SESSION_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||"dev-secret-change-me";
export function hashPassword(password,salt=crypto.randomBytes(16).toString("hex")){const hash=crypto.scryptSync(password,salt,64).toString("hex");return `${salt}:${hash}`}
export function verifyPassword(password,stored=""){const [salt,hash]=stored.split(":");if(!salt||!hash)return false;const actual=crypto.scryptSync(password,salt,64);const expected=Buffer.from(hash,"hex");return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected)}
export function signSession(payload){const body=Buffer.from(JSON.stringify(payload)).toString("base64url");const sig=crypto.createHmac("sha256",secret()).update(body).digest("base64url");return `${body}.${sig}`}
export function readSessionValue(value=""){try{const [body,sig]=value.split(".");const expected=crypto.createHmac("sha256",secret()).update(body).digest("base64url");if(!sig||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const data=JSON.parse(Buffer.from(body,"base64url").toString());if(data.exp<Date.now())return null;return data}catch{return null}}
export function cookieName(){return COOKIE}
