import "server-only";
import { timingSafeEqual } from "node:crypto";

export function authorizeInternal(request: Request) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  return [process.env.CREWOS_WORKER_SECRET, process.env.CRON_SECRET].filter((secret): secret is string => Boolean(secret)).some((secret) => {
    const expectedBuffer = Buffer.from(secret);
    return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
  });
}
