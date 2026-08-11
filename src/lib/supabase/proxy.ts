import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isDemoModeAllowed, isSupabaseConfigured } from "./config";

const publicRoutes = ["/login", "/cadastro", "/recuperar", "/nova-senha", "/auth/callback", "/api/internal/", "/api/webhooks/"];

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    if (request.nextUrl.pathname === "/api/waitlist" && ["POST", "OPTIONS"].includes(request.method)) return NextResponse.next({ request });
    if (isDemoModeAllowed()) return NextResponse.next({ request });

    const path = request.nextUrl.pathname;
    if (path === "/" || path === "/termos" || path === "/privacidade" || path.startsWith("/_next") || path.includes(".")) {
      return NextResponse.next({ request });
    }

    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "CrewOS não configurado para operação" }, { status: 503 });
    }

    return new NextResponse("CrewOS não configurado para operação. Configure o Supabase ou autorize explicitamente o modo demo.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublicWaitlistSubmission = path === "/api/waitlist" && ["POST", "OPTIONS"].includes(request.method);
  const isPublic = isPublicWaitlistSubmission || publicRoutes.some((route) => path.startsWith(route));
  const isProtected = !isPublic && !path.startsWith("/_next") && !path.includes(".");
  if (!authenticated && isProtected) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 });
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.searchParams.set("next", path);
    return NextResponse.redirect(target);
  }
  if (authenticated && ["/login", "/cadastro"].includes(path)) return NextResponse.redirect(new URL("/central", request.url));
  return response;
}
