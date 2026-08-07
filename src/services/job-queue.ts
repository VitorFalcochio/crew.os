import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface JobRecord { id: string; organization_id: string; task_id: string | null; employee_id: string | null; job_type: string; payload: Record<string, unknown>; status: string; priority: number; attempt: number; max_attempts: number; }

export class JobQueue {
  private readonly db = createAdminClient();
  async claim(workerId: string): Promise<JobRecord | null> {
    const { data, error } = await this.db.rpc("claim_next_job", { p_worker_id: workerId, p_lock_minutes: 10 });
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : data) as JobRecord | null;
  }
  async succeed(jobId: string) { const { error } = await this.db.from("jobs").update({ status: "succeeded", completed_at: new Date().toISOString(), locked_at: null, locked_by: null }).eq("id", jobId); if (error) throw error; }
  async waitForApproval(jobId: string) { const { error } = await this.db.from("jobs").update({ status: "waiting_approval", locked_at: null, locked_by: null }).eq("id", jobId); if (error) throw error; }
  async fail(job: JobRecord, error: unknown, retryable = true) {
    const finalAttempt = job.attempt >= job.max_attempts;
    const delaySeconds = Math.min(3600, 15 * 2 ** Math.max(0, job.attempt - 1));
    const status = finalAttempt ? "dead" : retryable ? "queued" : "failed";
    const { error: updateError } = await this.db.from("jobs").update({ status, run_after: new Date(Date.now() + delaySeconds * 1000).toISOString(), locked_at: null, locked_by: null, last_error: { message: error instanceof Error ? error.message : String(error), at: new Date().toISOString(), retryable }, completed_at: status === "dead" || status === "failed" ? new Date().toISOString() : null }).eq("id", job.id);
    if (updateError) throw updateError;
  }
}
