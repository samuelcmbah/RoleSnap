import { Hono } from 'hono' //organizes worker into routes and handlers
import { createClient } from '@libsql/client' //lets worker talk to db
import { count } from 'node:console'
import { raw } from 'hono/html'


// defines the expected shape of the environment variables
type Bindings = {
	GROQ_API_KEY: string
	TURSO_DATABASE_URL: string
	TURSO_AUTH_TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()

//helper function to connect to the Turso database
const getDbClient = (env: Bindings) => {
	return createClient({
		url: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN
	})
}

app.get('/', (contextObject) => {
	return contextObject.text('RoleSnap API is running!')
})

// The parsing endpoint
app.post('/api/parse', async (contextObj) => {
	const { text, sourceUrl } = await contextObj.req.json()

	if (!text) {
		return contextObj.json({ error: 'Missing "text" in request body' }, 400)
	}

	try {
		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${contextObj.env.GROQ_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'llama-3.3-70b-versatile',
				messages: [
					{
						role: 'system',
						content: `You are a Universal Tech Job Data Extractor. Your goal is to convert any job posting (LinkedIn, Twitter, WhatsApp, Telegram, or Web) into structured JSON.

						RULES:
						1. Return ONLY valid JSON ARRAY of objects. Even if there is only one job, return it insie an array: [{"title": "Software Engineer", "company": "Google", ...}, {...}, ...]
						2. COMPANY: If not explicitly stated, infer from email domains or source URLs (e.g., 'jobs.netflix.com' -> 'Netflix').
						3. LOCATION: Be specific. Include [City, Country] AND work mode (e.g., 'Lagos, Nigeria (Remote)', 'London, UK (Hybrid)', or 'New York, USA (On-site)').
						4. SALARY: Capture ranges and detect ALL currency symbols ($, ₦, £, €, etc.). Always include the frequency (e.g., '$120k/year', '₦1.2M/month', '€50/hour'). 
						5. REQUIREMENTS: This MUST be a flat array of strings. Extract all technical skills, frameworks, and tools (e.g., 'Excel', 'React', 'NYSC Member', 'Attention to detail', 'Docker', 'AWS').
						6. CONTACT_INFO: Capture emails, application links, mobile numbers, or social media handles. This MUST be a single string (e.g., "08012345678" or "hr@company.com").
						7. If any information is missing or cannot be inferred, use 'N/A' for that field.
						8. If the job post is in a language other than English, translate it first before extracting data.

						JSON Keys: title, company, location, salary, requirements (array), contact_info.`
					},
					{
						role: 'user',
						content: text
					}
				],
				response_format: { type: 'json_object' }

			})
		})

		const data: any = await response.json()
		const rawContent = JSON.parse(data.choices[0].message.content)

		const parsedJobArray = Array.isArray(rawContent) ? rawContent : (rawContent.jobs || [rawContent])

		const finalParsedJobs = parsedJobArray.map((job: any) => ({
			...job,
			source_url: sourceUrl || 'N/A',
			raw_text: text
		}))

		return contextObj.json(finalParsedJobs)
		
	} catch (error) {
		console.error('Error parsing job post:', error)
		return contextObj.json({ error: 'Failed to parse job post' }, 500)
	}
})

// Save job endpoint
app.post('/api/jobs', async (contextObj) => {
	const db = getDbClient(contextObj.env)

	const jobData = await contextObj.req.json() // this is an array of job objects.

	const tempUserId = 'user-123' // get from Clerk later in phase 2
	crypto.randomUUID()

	const jobsArray = Array.isArray(jobData) ? jobData : [jobData] // Ensure we have an array to work with
	try {

		const queries = jobsArray.map((job: any) => {
			return {
				sql: `INSERT INTO jobs (
						id, user_id, title, company, location, salary, requirements,
					  contact_info, source_url, raw_text, status, source_method
			) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				args: [
					crypto.randomUUID(), // Generate a unique ID for each job
					tempUserId,
					job.title || 'N/A',
					job.company || 'N/A',
					job.location || 'N/A',
					job.salary || 'N/A',
					JSON.stringify(job.requirements || []), // Store array as JSON string
					job.contact_info || 'N/A',
					job.source_url || 'N/A',
					job.raw_text || '',
					'saved',
					job.source_method || 'manual'
				]
			}
		})

		await db.batch(queries) //Turso multiple inserts

		return contextObj.json({ success: true, count: jobsArray.length }, 201)
	} catch (error) {	
		console.error('Error saving job:', error)
		return contextObj.json({ error: 'Failed to save batch' }, 500)
	}
})

// List Jobs Route ---
app.get('/api/jobs', async (contextObj) => {
	const db = getDbClient(contextObj.env)
	const tempUserId = "user-123"

	try {
		const result = await db.execute({
			sql: "SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC",
			args: [tempUserId]
		})

		const jobs = result.rows.map(row => ({
			...row,
			requirements: JSON.parse(row.requirements as string || '[]')
		}))

		return contextObj.json(jobs)
	} catch (e) {
		return contextObj.json({ error: 'Failed to fetch jobs' }, 500)
	}
})

export default app