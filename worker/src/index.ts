import { Hono } from 'hono'
import { sentry } from '@hono/sentry' // Hono has a built-in wrapper for Sentry
import { createClient } from '@libsql/client'
import { cors } from 'hono/cors'

// defines the expected shape of the environment variables
type Bindings = {
	GROQ_API_KEY: string
	TURSO_DATABASE_URL: string
	TURSO_AUTH_TOKEN: string
	SENTRY_DSN: string
}

const app = new Hono<{ Bindings: Bindings }>() //Hono runs the api. receives requests, routes them, runs middleware, provide contextObject... sends response back

app.use('/api/*', cors()) //enable CORS for all routes under /api
	
// This middleware catches all unhandled exceptions
app.use('*', async (c, next) => {
  const sentryHandler = sentry({ dsn: c.env.SENTRY_DSN });
  return sentryHandler(c, next);
})

// helper function to connect to the Turso database
const getDbClient = (env: Bindings) => {
	return createClient({
		url: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN
	})
}

app.get('/', (c) => {
	return c.text('RoleSnap API is running!')
})

const rateLimitMap = new Map<string, { count: number, lastReset: number }>();

const rateLimiter = async (c: any, next: any) => {
	const ip = c.req.header('cf-connecting-ip') || 'anonymous';
	const now = Date.now();
	const windowMs = 60 * 1000; // 1 minute window
	const maxRequests = 10;     // Max 10 requests per minute

	const record = rateLimitMap.get(ip) || { count: 0, lastReset: now };

	// If 1 minute has passed, reset the counter
	if (now - record.lastReset > windowMs) {
		record.count = 0;
		record.lastReset = now;
	}

	if (record.count >= maxRequests) {
		console.log(`Rate limit exceeded for IP: ${ip}`);
		return c.json({ 
			error: 'Too Many Requests', 
			message: 'You can only parse 10 jobs per minute. Please wait.' 
		}, 429);
	}

	// Increment and save
	record.count++;
	rateLimitMap.set(ip, record);

	await next();
};

// ========================
// PARSE ENDPOINT
// ========================
app.post('/api/parse', rateLimiter, async (c) => {
	const { text, sourceUrl } = await c.req.json()

	// Initial length guardrail
	if (!text || text.trim().length < 100) {
		return c.json({ error: 'Text too short to be a valid job post' }, 400)
	}

	if (text.length > 5000) {
		return c.json({ error: 'Validation Failed: Text exceeds 5,000 character limit' }, 400)
	}

		const sanitizedText = text.trim();


	try {
		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${c.env.GROQ_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'llama-3.3-70b-versatile', // High reasoning capability
				messages: [
					{
						role: 'system',
						content: `
You are an expert Job Classifier and Extractor.

TASK:
1. Analyze the text to see if it is a job advertisement, internship, or contract opportunity.
2. If the text is general conversation, news, a resume, or spam, return: {"jobs": []}
3. If it IS a job, extract the details into the "jobs" array.

EXTRACTION RULES:
- COMPANY: If not explicitly stated, Infer from emails (e.g. "hr@kuda.com" -> "Kuda") or links (jobs.netflix.com' -> 'Netflix').
- LOCATION: Use "City, Country (Mode)" e.g., "Lagos, Nigeria (Hybrid)". If just Remote, put "Remote".
- SALARY: Must include currency (₦, $, £). Format as "Range (Frequency)" e.g. "₦500k - ₦700k/month".
- REQUIREMENTS: This MUST be a flat array of strings. Extract all technical skills, frameworks, and tools (e.g., 'Excel', 'React', 'NYSC Member', 'Attention to detail', 'Docker', 'AWS').
- CONTACT_INFO: Capture ONLY specific, actionable credentials: - Full Emails - Phone numbers - Specific URLs - Specific handles (e.g., "@TechGuy") DO NOT capture vague instructions like "DM", "Inbox", "Check bio", or "PM". If no specific credential is found, return "N/A".


OUTPUT FORMAT:
IMPORTANT: NEVER use words like "Unknown", "Unspecified", "TBD", or "Not stated". It is either the real value or "N/A".
Return ONLY a JSON object with a "jobs" key.
Example of non-job: {"jobs": []}
Example of job: {"jobs": [{"title": "...", "company": "...", ...}]}
`
					},
					{ role: 'user', content: sanitizedText }
				],
				response_format: { type: "json_object" },
				temperature: 0.1 // Keep it deterministic to reduce hallucinations
			})
		})


		// Check if Groq returned an error (like Rate Limit or Authentication)
		if (!response.ok) {
			const errorData = await response.text();

			// MANUAL CAPTURE: Send Groq failures to Sentry
			const sentry = c.get('sentry');
			if (sentry) 
				sentry.withScope((scope) => {
					scope.setExtra('status', response.status)
					scope.setExtra('body', errorData)

					sentry.captureMessage(`Groq API Error: ${response.status}`)
				})
			
			return c.json({ error: 'AI processing failed' }, 502);
		}

		const data: any = await response.json()

		// Handle Groq-level errors (rate limits, etc.)
		if (data.error) {
			console.error('Groq API Error:', data.error)
			return c.json({ error: 'AI provider error' }, 502)
		}

		const content = JSON.parse(data.choices[0]?.message?.content || '{"jobs": []}')
		
		// If the AI determined it wasn't a job, content.jobs will be []
		const rawJobs = content.jobs || []

		if (rawJobs.length === 0) {
			console.log("AI Veto: Text was not identified as a job post.")
			return c.json([]) // Returns empty array to frontend as per blueprint
		}

		// Final cleanup and mapping
		const cleanedJobs = rawJobs.map((job: any) => ({
			title: job.title || 'N/A',
			company: job.company || 'N/A',
			location: job.location || 'N/A',
			salary: job.salary || 'N/A',
			requirements: Array.isArray(job.requirements) ? job.requirements : [], // Ensure it's an array
			contact_info: job.contact_info || 'N/A',
			source_url: sourceUrl || 'N/A',
			raw_text: text
		}))

		return c.json(cleanedJobs)

	} catch (error: any) {
		console.error('Extraction Error:', error)

		throw error; // Let the Sentry middleware catch this
	}
})



// ========================
// SAVE JOBS
// ========================
app.post('/api/jobs', async (c) => {
	const db = getDbClient(c.env)
	const jobData = await c.req.json()

	const tempUserId = 'user-123'

	const jobsArray = Array.isArray(jobData) ? jobData : [jobData]

	try {
		const queries = jobsArray.map((job: any) => ({
			sql: `INSERT INTO jobs (
				id, user_id, title, company, location, salary, requirements,
				contact_info, source_url, raw_text, status, source_method
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [
				crypto.randomUUID(),
				tempUserId,
				job.title || 'N/A',
				job.company || 'N/A',
				job.location || 'N/A',
				job.salary || 'N/A',
				JSON.stringify(job.requirements || []),
				job.contact_info || 'N/A',
				job.source_url || 'N/A',
				job.raw_text || '',
				'saved',
				job.source_method || 'manual'
			]
		}))

		await db.batch(queries)

		return c.json({ success: true, count: jobsArray.length }, 201)

	} catch (error) {
		console.error('Error saving job:', error)
		return c.json({ error: 'Failed to save batch' }, 500)
	}
})

// ========================
// LIST JOBS
// ========================
app.get('/api/jobs', async (c) => {
	const db = getDbClient(c.env)
	const tempUserId = "user-123"

	try {
		const result = await db.execute({
			sql: "SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC",
			args: [tempUserId]
		})

		const jobs = result.rows.map(row => ({
			...row,
			requirements: JSON.parse((row.requirements as string) || '[]')
		}))

		return c.json(jobs)

	} catch (e) {
		return c.json({ error: 'Failed to fetch jobs' }, 500)
	}
})

export default app