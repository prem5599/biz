/**
 * Rate Limiting Middleware
 * Prevents API abuse using in-memory or Redis-based rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per window
}

// In-memory store for rate limiting (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, number[]>();

/**
 * Rate limit check
 * @param identifier - Unique identifier (IP address, user ID, API key)
 * @param config - Rate limit configuration
 * @returns True if request should be allowed
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100, // 100 requests per minute
  }
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const windowStart = now - config.interval;

  // Get existing timestamps for this identifier
  let timestamps = rateLimitStore.get(identifier) || [];

  // Remove timestamps outside the current window
  timestamps = timestamps.filter((timestamp) => timestamp > windowStart);

  // Check if limit exceeded
  const allowed = timestamps.length < config.uniqueTokenPerInterval;
  const remaining = Math.max(0, config.uniqueTokenPerInterval - timestamps.length - 1);
  const oldestTimestamp = timestamps[0] || now;
  const resetIn = Math.max(0, config.interval - (now - oldestTimestamp));

  if (allowed) {
    // Add current timestamp
    timestamps.push(now);
    rateLimitStore.set(identifier, timestamps);
  }

  return { allowed, remaining, resetIn };
}

/**
 * Get identifier from request (IP address or user ID)
 */
export function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

  const ip =
    cfConnectingIp ||
    realIp ||
    forwarded?.split(',')[0] ||
    request.ip ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  try {
    // Get identifier
    const identifier = getIdentifier(request);

    // Check rate limit
    const { allowed, remaining, resetIn } = checkRateLimit(identifier, config);

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config?.uniqueTokenPerInterval.toString() || '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + resetIn).toISOString(),
            'Retry-After': Math.ceil(resetIn / 1000).toString(),
          },
        }
      );
    }

    // Request allowed - could add headers to response
    return null; // null means allow the request
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow the request (fail open)
    return null;
  }
}

/**
 * Clean up old entries periodically (prevent memory leaks)
 */
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const filtered = timestamps.filter((t) => now - t < maxAge);
    if (filtered.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, filtered);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

/**
 * Redis-based rate limiting (for production with multiple instances)
 */
export async function rateLimitRedis(
  identifier: string,
  config: RateLimitConfig = {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 100,
  }
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  // Only use Redis if available
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    // Fallback to in-memory
    return checkRateLimit(identifier, config);
  }

  try {
    const { createClient } = await import('redis');
    const client = createClient({ url: redisUrl });

    if (!client.isOpen) {
      await client.connect();
    }

    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.interval;

    // Use Redis sorted set for efficient time-based cleanup
    // Remove old entries
    await client.zRemRangeByScore(key, 0, windowStart);

    // Count current entries
    const count = await client.zCard(key);

    const allowed = count < config.uniqueTokenPerInterval;
    const remaining = Math.max(0, config.uniqueTokenPerInterval - count - 1);

    if (allowed) {
      // Add current request
      await client.zAdd(key, { score: now, value: `${now}` });

      // Set expiry on the key
      await client.expire(key, Math.ceil(config.interval / 1000));
    }

    // Calculate reset time
    const oldestScore = await client.zRange(key, 0, 0, { REV: false });
    const resetIn = oldestScore.length > 0
      ? Math.max(0, config.interval - (now - parseInt(oldestScore[0])))
      : 0;

    await client.disconnect();

    return { allowed, remaining, resetIn };
  } catch (error) {
    console.error('Redis rate limiting error:', error);
    // Fallback to in-memory
    return checkRateLimit(identifier, config);
  }
}

/**
 * Different rate limit tiers
 */
export const RateLimits = {
  // Very strict for authentication endpoints
  AUTH: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 5, // 5 attempts per minute
  },

  // Strict for write operations
  WRITE: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 30, // 30 requests per minute
  },

  // Standard for read operations
  READ: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100, // 100 requests per minute
  },

  // Relaxed for public endpoints
  PUBLIC: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 300, // 300 requests per minute
  },

  // Very strict for expensive operations
  EXPENSIVE: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 requests per minute
  },
} as const;
