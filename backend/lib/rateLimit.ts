import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Simple in-memory cache
const cache = new Map<string, { count: number; resetTime: number }>();

export const LIMIT_CONFIGS = {
  feedback: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  write: { limit: 60, windowMs: 60 * 1000 },       // 60 per minute
  read: { limit: 300, windowMs: 60 * 1000 },       // 300 per minute
};

/**
 * Checks if the user has exceeded their rate limit for the given category.
 * Returns a 429 NextResponse if rate limit exceeded, otherwise returns null.
 */
export function checkRateLimit(
  category: keyof typeof LIMIT_CONFIGS,
  userId: string
): NextResponse | null {
  const key = `${userId}:${category}`;
  const config = LIMIT_CONFIGS[category];
  const now = Date.now();

  // Lazy cache cleanup to prevent memory leaks
  if (cache.size > 10000) {
    for (const [k, v] of cache.entries()) {
      if (now > v.resetTime) {
        cache.delete(k);
      }
    }
  }

  const record = cache.get(key);

  if (!record || now > record.resetTime) {
    cache.set(key, { count: 1, resetTime: now + config.windowMs });
    return null;
  }

  if (record.count >= config.limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    const response = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }

  record.count += 1;
  return null;
}

/**
 * Authenticates the user session and applies the rate limiter.
 * Returns an object with the session (if successful) or errorResponse (if rejected).
 */
export async function authenticateAndRateLimit(
  category: keyof typeof LIMIT_CONFIGS
): Promise<{ session?: any; errorResponse?: NextResponse }> {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const limitResponse = checkRateLimit(category, session.user.id);
  if (limitResponse) {
    return { errorResponse: limitResponse };
  }

  return { session };
}
