import { Context, Next } from 'hono'

const rateLimitMap = new Map<string, { count: number, lastReset: number }>()

export const rateLimiter = async (c: Context, next: Next) => {
	const ip = c.req.header('cf-connecting-ip') || 'anonymous'
	const now = Date.now()
	const windowMs = 60 * 1000 // 1 minute window
	const maxRequests = 10 // Max 10 requests per minute

	const record = rateLimitMap.get(ip) || { count: 0, lastReset: now }

	// If 1 minute has passed, reset the counter
	if (now - record.lastReset > windowMs) {
		record.count = 0
		record.lastReset = now
	}

	if (record.count >= maxRequests) {
		return c.json({
			success: false,
			error: {
				message: 'Too Many Requests: You can only parse 10 jobs per minute. Please wait.',
				code: 'RATE_LIMIT_EXCEEDED'
			}
		}, 429)
	}

	// Increment and save
	record.count++
	rateLimitMap.set(ip, record)

	await next()
}