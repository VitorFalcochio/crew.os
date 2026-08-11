const attempts = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;

export function consumeWaitlistAttempt(identifier: string, now = Date.now()) {
  const recent = (attempts.get(identifier) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  recent.push(now);
  attempts.set(identifier, recent);
  if (attempts.size > 5000) {
    for (const [key, values] of attempts) if (!values.some((timestamp) => now - timestamp < WINDOW_MS)) attempts.delete(key);
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
