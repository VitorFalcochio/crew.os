import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";

export function assertLocalCollectionApi(request: Request, mutation = true) {
  if (isSupabaseConfigured()) throw new CollectionApiError("Cobranças reais locais não estão disponíveis com Supabase", 501);
  if (process.env.NODE_ENV === "production") throw new CollectionApiError("Cobranças locais são bloqueadas em produção", 403);
  if (mutation) {
    const origin = request.headers.get("origin");
    const expected = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").origin;
    if (!origin || origin !== expected) throw new CollectionApiError("Origem da solicitação não autorizada", 403);
  }
}

export class CollectionApiError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function collectionApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha ao processar a cobrança";
  const status = error instanceof CollectionApiError ? error.status
    : message.includes("não encontrada") ? 404
      : message.includes("já está sendo") ? 409
        : message.includes("Reconecte") || message.includes("não está conectado") ? 401
          : message.includes("allowlist") || message.includes("bloqueado") ? 403
            : 400;
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}
