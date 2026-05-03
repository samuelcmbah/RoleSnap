import { Hono } from 'hono'
import { GroqClient } from '../../../infrastructure/ai/GroqClient'
import { ParseJobText } from '../../../application/use-cases/ParseJobText'
import { AppError } from '../../../shared/errors/AppError'
import { Bindings } from '../../../shared/types/Bindings'
import { rateLimiter } from '../middleware/rateLimiter'

export const parseRoute = new Hono<{ Bindings: Bindings }>()

parseRoute.post('/', rateLimiter, async (c) => {
	const requestId = crypto.randomUUID()

	try {
		const { text, sourceUrl } = await c.req.json()

		// Initial length guardrail
		if (!text || text.trim().length < 100) {
			return c.json({
				success: false,
				error: {
					message: 'Text too short to be a valid job post',
					code: 'VALIDATION_ERROR',
					requestId
				}
			}, 400)
		}

		if (text.length > 5000) {
			return c.json({
				success: false,
				error: {
					message: 'Validation Failed: Text exceeds 5,000 character limit',
					code: 'VALIDATION_ERROR',
					requestId
				}
			}, 400)
		}

		const sanitizedText = text.trim()

		const useCase = new ParseJobText(
			new GroqClient(c.env.GROQ_API_KEY)
		)

		const rawJobs = await useCase.execute(sanitizedText)

		if (rawJobs.length === 0) {
			return c.json({
				success: true,
				data: []
			})
		}

		// Final cleanup and mapping
		const cleanedJobs = rawJobs.map((job: any) => ({
			title: job.title || 'N/A',
			company: job.company || 'N/A',
			location: job.location || 'N/A',
			salary: job.salary || 'N/A',
			requirements: Array.isArray(job.requirements) ? job.requirements : [],
			contact_info: job.contact_info || 'N/A',
			source_url: sourceUrl || 'N/A',
			raw_text: text
		}))

		return c.json({
			success: true,
			data: cleanedJobs
		})

	} catch (err: any) {
		if (err instanceof AppError) {
			return c.json({
				success: false,
				error: {
					message: err.message,
					code: err.code,
					requestId
				}
			}, { status: err.statusCode as any })
		}

		return c.json({
			success: false,
			error: {
				message: 'Internal server error during parsing',
				code: 'PARSE_ERROR',
				requestId
			}
		}, 500)
	}
})