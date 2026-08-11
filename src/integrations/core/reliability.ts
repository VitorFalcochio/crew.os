import { IntegrationError } from "./errors";

export class IntegrationRateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly limit = 60, private readonly windowMs = 60_000, private readonly clock = () => Date.now()) {}
  consume(key: string) { const now = this.clock(); const current = this.windows.get(key); const window = !current || current.resetAt <= now ? { count: 0, resetAt: now + this.windowMs } : current; if (window.count >= this.limit) throw new IntegrationError("RATE_LIMITED", "Limite temporário da conexão atingido", true, 429); window.count += 1; this.windows.set(key, window); return { remaining: this.limit - window.count, resetAt: new Date(window.resetAt).toISOString() }; }
}

export async function withRetry<T>(operation: () => Promise<T>, options: { attempts?: number; baseDelayMs?: number; sleep?: (ms: number) => Promise<void> } = {}) {
  const attempts = options.attempts ?? 3; const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))); let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(); } catch (error) { last = error; if (!(error instanceof IntegrationError) || !error.retryable || attempt === attempts) throw error; await sleep((options.baseDelayMs ?? 100) * 2 ** (attempt - 1)); }
  }
  throw last;
}
