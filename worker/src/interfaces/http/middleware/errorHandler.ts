import { Context, Next } from 'hono'

export const errorHandler = async (c: Context, next: Next) => {
	try {
		await next()
	} catch (err: any) {
		const requestId = crypto.randomUUID()

		return c.json({
			success: false,
			error: {
				message: 'Internal Server Error',
				code: 'INTERNAL_ERROR',
				requestId
			}
		}, 500)
	}
}