import { authorizeInternal } from "@/lib/auth/internal";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobQueue } from "@/services/job-queue";
import { ContinuousWorker } from "@/agents/orchestration/continuous-worker";

export const maxDuration = 55;
async function tick(request: Request) {
  if (!authorizeInternal(request)) return Response.json({ error: "Worker não autorizado" }, { status: 401 });
  const db = createAdminClient();
  const { data: recurringCreated, error: recurringError } = await db.rpc("enqueue_due_recurring_delegations", { p_limit: 50 });
  if (recurringError) return Response.json({ error: recurringError.message }, { status: 500 });
  const queue = new JobQueue(); const worker = new ContinuousWorker(queue);
  const requestedBatch = Number(new URL(request.url).searchParams.get("batch") ?? 5);
  const batch = Math.max(1, Math.min(10, requestedBatch));
  const workerId = `web-${crypto.randomUUID()}`; const results = [];
  for (let index = 0; index < batch; index += 1) { const job = await queue.claim(workerId); if (!job) break; results.push(await worker.process(job)); }
  return Response.json({ recurringCreated, jobsProcessed: results.length, results });
}
export async function GET(request: Request) { return tick(request); }
export async function POST(request: Request) { return tick(request); }
