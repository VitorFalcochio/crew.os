import { ZodError } from "zod";
import { AuthenticationError, OrganizationAccessError } from "@/lib/auth/session";
import { IntegrationError } from "@/integrations/core/errors";

export function apiError(error: unknown) {
  if (error instanceof AuthenticationError) return Response.json({ error: error.message }, { status: 401 });
  if (error instanceof OrganizationAccessError) return Response.json({ error: error.message }, { status: 403 });
  if (error instanceof IntegrationError) return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: "Dados inválidos", issues: error.issues }, { status: 400 });
  console.error(error);
  return Response.json({ error: "Não foi possível concluir a operação" }, { status: 500 });
}
