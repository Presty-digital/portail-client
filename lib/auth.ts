import {redirect} from "next/navigation";import {getSession} from "./session.js";
export async function requireProfile(expected){const s=await getSession();if(!s)redirect("/");if(expected&&s.role!==expected)redirect("/");return s}
