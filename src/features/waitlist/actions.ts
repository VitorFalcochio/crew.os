"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WAITLIST_ADMIN_COOKIE, validWaitlistAdminPassword, waitlistAdminToken } from "./admin-auth";

export async function loginWaitlistAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!validWaitlistAdminPassword(password)) redirect("/lista-de-espera/acesso?error=Senha%20administrativa%20inválida");
  const cookieStore = await cookies();
  cookieStore.set(WAITLIST_ADMIN_COOKIE, waitlistAdminToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  redirect("/lista-de-espera");
}
export async function logoutWaitlistAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(WAITLIST_ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  redirect("/lista-de-espera/acesso");
}
