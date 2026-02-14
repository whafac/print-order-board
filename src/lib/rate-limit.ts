const store = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute

function getLimit() {
  const n = process.env.RATE_LIMIT_PER_MINUTE;
  return n ? parseInt(n, 10) : 60;
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);
  const limit = getLimit();

  if (!entry) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
