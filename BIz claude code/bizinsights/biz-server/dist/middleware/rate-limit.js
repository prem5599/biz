"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRateLimit = exports.syncRateLimit = exports.authRateLimit = exports.strictRateLimit = exports.apiRateLimit = void 0;
exports.rateLimit = rateLimit;
const server_1 = require("next/server");
const lru_cache_1 = require("lru-cache");
// Create an in-memory cache for rate limiting
// In production, use Redis for distributed rate limiting
const tokenCache = new lru_cache_1.LRUCache({
    max: 500, // Maximum number of tokens to track
    ttl: 60000, // 1 minute TTL
});
function rateLimit(options) {
    return async function rateLimitMiddleware(request) {
        // Get identifier (IP address or user ID)
        const identifier = getIdentifier(request);
        if (!identifier) {
            // If we can't identify the user, allow the request but log it
            console.warn('[RateLimit] Could not identify request origin');
            return null;
        }
        const now = Date.now();
        const bucket = tokenCache.get(identifier);
        if (!bucket) {
            // First request from this identifier
            tokenCache.set(identifier, {
                count: 1,
                resetTime: now + options.interval,
            });
            return null;
        }
        // Check if we need to reset the bucket
        if (now > bucket.resetTime) {
            bucket.count = 1;
            bucket.resetTime = now + options.interval;
            tokenCache.set(identifier, bucket);
            return null;
        }
        // Increment the counter
        bucket.count += 1;
        // Check if limit exceeded
        if (bucket.count > options.requestsPerInterval) {
            const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
            return server_1.NextResponse.json({
                success: false,
                error: 'Rate limit exceeded',
                message: `Too many requests. Please try again in ${retryAfter} seconds.`,
                retryAfter,
            }, {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': String(options.requestsPerInterval),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(bucket.resetTime),
                    'Retry-After': String(retryAfter),
                },
            });
        }
        // Update the bucket
        tokenCache.set(identifier, bucket);
        // Add rate limit headers to successful responses
        const remaining = options.requestsPerInterval - bucket.count;
        request.headers.set('X-RateLimit-Limit', String(options.requestsPerInterval));
        request.headers.set('X-RateLimit-Remaining', String(remaining));
        request.headers.set('X-RateLimit-Reset', String(bucket.resetTime));
        return null;
    };
}
function getIdentifier(request) {
    // Try to get user ID from session (if authenticated)
    const userId = request.headers.get('x-user-id');
    if (userId) {
        return `user:${userId}`;
    }
    // Fall back to IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    if (ip === 'unknown') {
        // Try other IP headers
        const realIp = request.headers.get('x-real-ip');
        if (realIp) {
            return `ip:${realIp}`;
        }
    }
    return ip !== 'unknown' ? `ip:${ip}` : null;
}
// Pre-configured rate limiters for common use cases
/**
 * Standard API rate limiter
 * 100 requests per minute per IP/user
 */
exports.apiRateLimit = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
    requestsPerInterval: 100,
});
/**
 * Strict rate limiter for sensitive operations
 * 10 requests per minute per IP/user
 */
exports.strictRateLimit = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
    requestsPerInterval: 10,
});
/**
 * Authentication rate limiter
 * 5 attempts per 15 minutes per IP
 */
exports.authRateLimit = rateLimit({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 500,
    requestsPerInterval: 5,
});
/**
 * Integration sync rate limiter
 * 20 syncs per hour per organization
 */
exports.syncRateLimit = rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 1000,
    requestsPerInterval: 20,
});
/**
 * Report generation rate limiter
 * 30 reports per day per organization
 */
exports.reportRateLimit = rateLimit({
    interval: 24 * 60 * 60 * 1000, // 24 hours
    uniqueTokenPerInterval: 1000,
    requestsPerInterval: 30,
});
//# sourceMappingURL=rate-limit.js.map