import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/autonomia") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/equipe";
    destination.search = "";
    return NextResponse.redirect(destination);
  }
  const legacySettingsTabs: Record<string, string> = { "/integracoes": "integracoes", "/assinatura": "assinatura" };
  const tab = legacySettingsTabs[request.nextUrl.pathname];
  if (tab) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/configuracoes";
    destination.search = `?tab=${tab}`;
    return NextResponse.redirect(destination);
  }
  return updateSession(request);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
