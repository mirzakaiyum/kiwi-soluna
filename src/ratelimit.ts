/**
 * Token Bucket Rate Limiter for Cloudflare Workers
 *
 * Uses an in-memory token bucket algorithm to rate limit requests by IP.
 * Note: In a distributed worker environment, each isolate has its own bucket store,
 * so this provides soft rate limiting rather than globally exact limits.
 *
 * Configuration:
 * - 30 requests per minute per IP
 * - Burst capacity of 10 requests
 */

export interface RateLimitConfig {
	tokensPerInterval: number // How many tokens are added per interval
	interval: number // Interval duration in ms
	bucketSize: number // Maximum tokens (burst capacity)
}

export interface TokenBucket {
	tokens: number
	lastRefill: number
}

export class RateLimiter {
	private buckets: Map<string, TokenBucket> = new Map()
	private config: RateLimitConfig
	private cleanupIntervalId: ReturnType<typeof setInterval> | null = null

	constructor(config: RateLimitConfig) {
		this.config = config
	}

	/**
	 * Start the cleanup routine to remove stale buckets
	 * Should be called once when the worker starts
	 */
	startCleanup(intervalMs: number = 60000): void {
		if (this.cleanupIntervalId) return
		this.cleanupIntervalId = setInterval(() => this.cleanup(), intervalMs)
	}

	/**
	 * Stop the cleanup routine
	 */
	stopCleanup(): void {
		if (this.cleanupIntervalId) {
			clearInterval(this.cleanupIntervalId)
			this.cleanupIntervalId = null
		}
	}

	/**
	 * Clean up stale buckets (older than 5 minutes)
	 */
	private cleanup(): void {
		const now = Date.now()
		const staleThreshold = 5 * 60 * 1000 // 5 minutes
		for (const [key, bucket] of this.buckets) {
			if (now - bucket.lastRefill > staleThreshold) {
				this.buckets.delete(key)
			}
		}
	}

	/**
	 * Check if a request is allowed for the given identifier (IP address)
	 * Returns true if allowed, false if rate limited
	 */
	isAllowed(identifier: string): boolean {
		const now = Date.now()
		let bucket = this.buckets.get(identifier)

		if (!bucket) {
			// Create new bucket with full tokens
			bucket = {
				tokens: this.config.bucketSize - 1, // Consume one token for this request
				lastRefill: now,
			}
			this.buckets.set(identifier, bucket)
			return true
		}

		// Calculate tokens to add based on elapsed time
		const elapsed = now - bucket.lastRefill
		const tokensToAdd = Math.floor(elapsed / this.config.interval) * this.config.tokensPerInterval
		bucket.tokens = Math.min(this.config.bucketSize, bucket.tokens + tokensToAdd)
		bucket.lastRefill = now

		// Check if we have tokens available
		if (bucket.tokens >= 1) {
			bucket.tokens -= 1
			return true
		}

		return false
	}

	/**
	 * Get remaining tokens for an identifier
	 */
	getRemainingTokens(identifier: string): number {
		const bucket = this.buckets.get(identifier)
		if (!bucket) return this.config.bucketSize
		return Math.floor(bucket.tokens)
	}

	/**
	 * Get the reset time in seconds for an identifier
	 */
	getResetTimeSeconds(identifier: string): number {
		const bucket = this.buckets.get(identifier)
		if (!bucket || bucket.tokens >= 1) return 0
		// Calculate time until next token is added
		const tokensNeeded = 1 - bucket.tokens
		const msUntilToken = Math.ceil((tokensNeeded / this.config.tokensPerInterval) * this.config.interval)
		return Math.ceil(msUntilToken / 1000)
	}
}

// Default rate limiter instance
// 30 requests per minute, with burst capacity of 10
export const rateLimiter = new RateLimiter({
	tokensPerInterval: 1,
	interval: 2000, // 1 token every 2 seconds = 30 per minute
	bucketSize: 10, // Burst capacity
})

/**
 * Extract client IP from Cloudflare request headers
 */
export function getClientIP(request: Request): string {
	// Cloudflare-specific header
	const cfIP = request.headers.get('CF-Connecting-IP')
	if (cfIP) return cfIP

	// Fallback headers
	const xRealIP = request.headers.get('X-Real-IP')
	if (xRealIP) return xRealIP

	const xForwardedFor = request.headers.get('X-Forwarded-For')
	if (xForwardedFor) return xForwardedFor.split(',')[0].trim()

	// Default fallback
	return 'unknown'
}

/**
 * Validate User-Agent header
 * Returns true if the User-Agent is valid/acceptable
 */
export function isValidUserAgent(request: Request): boolean {
	const userAgent = request.headers.get('User-Agent') || ''

	// Block empty user agents
	if (!userAgent) return false

	// Block known bot patterns (extend as needed)
	const suspiciousPatterns = [
		/curl\/[0-9]/i,
		/wget\//i,
		/python-requests/i,
		/python-urllib/i,
		/scrapy/i,
		/^$/,
	]

	// Note: Currently allowing these for development/testing
	// Uncomment to enable strict blocking:
	// for (const pattern of suspiciousPatterns) {
	// 	if (pattern.test(userAgent)) return false
	// }

	return true
}

/**
 * Create a rate limit response
 */
export function createRateLimitResponse(retryAfter: number): Response {
	return new Response(
		JSON.stringify({
			status: 429,
			error: 'Too Many Requests',
			message: 'Rate limit exceeded. Please try again later.',
			retryAfter,
		}),
		{
			status: 429,
			headers: {
				'content-type': 'application/json',
				'access-control-allow-origin': '*',
				'retry-after': String(retryAfter),
			},
		}
	)
}

/**
 * Create an unauthorized response for invalid requests
 */
export function createUnauthorizedResponse(reason: string): Response {
	return new Response(
		JSON.stringify({
			status: 403,
			error: 'Forbidden',
			message: reason,
		}),
		{
			status: 403,
			headers: {
				'content-type': 'application/json',
				'access-control-allow-origin': '*',
			},
		}
	)
}
