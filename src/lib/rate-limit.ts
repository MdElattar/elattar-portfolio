import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = { success: boolean };
type Limiter = { limit: (key: string) => Promise<LimitResult> };

const memoryWindows = new Map<string, { count: number; resetAt: number }>();
const memoryLimiter: Limiter = {
  async limit(key) {
    const now = Date.now();
    const window = memoryWindows.get(key);
    if (!window || window.resetAt <= now) {
      memoryWindows.set(key, { count: 1, resetAt: now + 60_000 });
      return { success: true };
    }
    window.count += 1;
    return { success: window.count <= 30 };
  },
};

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const upstashLimiter: Limiter | null = hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, "1 m"),
    })
  : null;

export const limiter: Limiter = upstashLimiter ?? memoryLimiter;
