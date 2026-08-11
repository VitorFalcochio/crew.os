import { ZodError } from "zod";
import { requireWaitlistAdmin } from "@/features/waitlist/admin-auth";
import { consumeWaitlistAttempt } from "@/features/waitlist/rate-limit";
import { parseWaitlistSubmission } from "@/features/waitlist/waitlist";
import { getWaitlistStorageMode, listWaitlistLeads, saveWaitlistLead, WaitlistStorageUnavailableError } from "@/features/waitlist/waitlist-store";

function allowedOrigins(request: Request) {
  const configured = (process.env.CREWOS_WAITLIST_ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  return new Set([new URL(request.url).origin, process.env.NEXT_PUBLIC_APP_URL, ...configured].filter((value): value is string => Boolean(value)));
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins(request).has(origin)) return {};
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}

function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins(request).has(origin)) throw new Error("WAITLIST_ORIGIN_BLOCKED");
}

function clientIdentifier(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function OPTIONS(request: Request) {
  try { assertOrigin(request); return new Response(null, { status: 204, headers: corsHeaders(request) }); }
  catch { return Response.json({ error: "Origem não autorizada" }, { status: 403 }); }
}

export async function POST(request: Request) {
  const headers = { ...corsHeaders(request), "Cache-Control": "no-store" };
  try {
    assertOrigin(request);
    const attempt = consumeWaitlistAttempt(clientIdentifier(request));
    if (!attempt.allowed) return Response.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429, headers: { ...headers, "Retry-After": String(attempt.retryAfterSeconds) } });
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) return Response.json({ error: "Envie os dados em JSON" }, { status: 415, headers });
    const submission = parseWaitlistSubmission(await request.json());
    if (submission.website) return Response.json({ ok: true, created: true }, { status: 201, headers });
    const result = await saveWaitlistLead(submission);
    return Response.json({ ok: true, created: result.created, message: result.created ? "Cadastro confirmado" : "Cadastro atualizado" }, { status: result.created ? 201 : 200, headers });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "Confira os campos informados", issues: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400, headers });
    if (error instanceof WaitlistStorageUnavailableError) return Response.json({ error: error.message }, { status: 503, headers });
    if (error instanceof SyntaxError) return Response.json({ error: "JSON inválido" }, { status: 400, headers });
    if (error instanceof Error && error.message === "WAITLIST_ORIGIN_BLOCKED") return Response.json({ error: "Origem não autorizada" }, { status: 403, headers });
    console.error("Falha ao registrar lista de espera", error);
    return Response.json({ error: "Não foi possível concluir seu cadastro agora" }, { status: 500, headers });
  }
}

export async function GET(request: Request) {
  try {
    await requireWaitlistAdmin();
    const url = new URL(request.url);
    const leads = await listWaitlistLeads({ query: url.searchParams.get("q") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 500) });
    return Response.json({ data: leads, total: leads.length, storage: getWaitlistStorageMode() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof WaitlistStorageUnavailableError) return Response.json({ error: error.message }, { status: 503 });
    return Response.json({ error: error instanceof Error ? error.message : "Acesso negado" }, { status: 403 });
  }
}
