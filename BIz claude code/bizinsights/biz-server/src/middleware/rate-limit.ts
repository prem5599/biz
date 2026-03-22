import { NextRequest, NextResponse } from 'next/server'
import { LRUCache } from 'lru-cache'

interface RateLimitOptions {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max number of unique tokens
  requestsPerInterval: number // Max requests per token per interval
}

interface TokenBucket {
  count: number
  resetTime: number
}

// Create an in-memory cache for rate limiting
// In production, use Redis for distributed rate limiting
const tokenCache = new LRUCache<string, TokenBucket>({
  max: 500, // Maximum number of tokens to track
  ttl: 60000, // 1 minute TTL
})

export function rateLimit(options: RateLimitOptions) {
  return async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    // Get identifier (IP address or user ID)
    const identifier = getIdentifier(request)

    if (!identifier) {
      // If we can't identify the user, allow the request but log it
      console.warn('[RateLimit] Could not identify request origin')
      return null
    }

    const now = Date.now()
    const bucket = tokenCache.get(identifier)

    if (!bucket) {
      // First request from this identifier
      tokenCache.set(identifier, {
        count: 1,
        resetTime: now + options.interval,
      })
      return null
    }

    // Check if we need to reset the bucket
    if (now > bucket.resetTime) {
      bucket.count = 1
      bucket.resetTime = now + options.interval
      tokenCache.set(identifier, bucket)
      return null
    }

    // Increment the counter
    bucket.count += 1

    // Check if limit exceeded
    if (bucket.count > options.requestsPerInterval) {
      const retryAfter = Math.ceil((bucket.resetTime - now) / 1000)

      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(options.requestsPerInterval),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(bucket.resetTime),
            'Retry-After': String(retryAfter),
          },
        }
      )
    }

    // Update the bucket
    tokenCache.set(identifier, bucket)

    // Add rate limit headers to successful responses
    const remaining = options.requestsPerInterval - bucket.count
    request.headers.set('X-RateLimit-Limit', String(options.requestsPerInterval))
    request.headers.set('X-RateLimit-Remaining', String(remaining))
    request.headers.set('X-RateLimit-Reset', String(bucket.resetTime))

    return null
  }
}

function getIdentifier(request: NextRequest): string | null {
  // Try to get user ID from session (if authenticated)
  const userId = request.headers.get('x-user-id')
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

  if (ip === 'unknown') {
    // Try other IP headers
    const realIp = request.headers.get('x-real-ip')
    if (realIp) {
      return `ip:${realIp}`
    }
  }

  return ip !== 'unknown' ? `ip:${ip}` : null
}

// Pre-configured rate limiters for common use cases

/**
 * Standard API rate limiter
 * 100 requests per minute per IP/user
 */
export const apiRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  requestsPerInterval: 100,
})

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per minute per IP/user
 */
export const strictRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  requestsPerInterval: 10,
})

/**
 * Authentication rate limiter
 * 5 attempts per 15 minutes per IP
 */
export const authRateLimit = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500,
  requestsPerInterval: 5,
})

/**
 * Integration sync rate limiter
 * 20 syncs per hour per organization
 */
export const syncRateLimit = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 1000,
  requestsPerInterval: 20,
})

/**
 * Report generation rate limiter
 * 30 reports per day per organization
 */
export const reportRateLimit = rateLimit({
  interval: 24 * 60 * 60 * 1000, // 24 hours
  uniqueTokenPerInterval: 1000,
  requestsPerInterval: 30,
})
