import { Hono } from 'hono'
import { createClient } from '@libsql/client'


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
						content: `You are a job data extractor. Extract details from this Nigerian job post. 
            RULES:
            1. Return ONLY valid JSON.
            2. If a company name is not explicitly mentioned, use "N/A" (don't guess from emails).
            3. Include "monthly" or "annual" in the salary if specified.
            4. Keep location concise (e.g., "Lagos (Hybrid)").
            5. The "stack" must be a flat array of strings.
            
            JSON Keys: title, company, location, salary, stack, contact_info.`
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
		const parsedJob =JSON.parse(data.choices[0].message.content)

		return contextObj.json({
			...parsedJob,
			source_url: sourceUrl || 'N/A'
		})
	} catch (error) {
		console.error('Error parsing job post:', error)
		return contextObj.json({ error: 'Failed to parse job post' }, 500)
	}
		})

// Save job endpoint
app.post('/api/jobs', async (contextObj) => {
	const db = getDbClient(contextObj.env)

	const jobData = await contextObj.req.json()

	const tempUserId = 'user-123' // get from Clerk later in phase 2
	const jobId = crypto.randomUUID()

	try {
		await db.execute({
			sql: `INSERT INTO jobs (
						id, user_id, title, company, location, salary, stack,
					  contact_info, source_url, raw_text, status, source_method
			) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [
        jobId,
        tempUserId,
        jobData.title || 'N/A',
        jobData.company || 'N/A',
        jobData.location || 'N/A',
        jobData.salary || 'N/A',
        JSON.stringify(jobData.stack || []), // Store array as JSON string
        jobData.contact_info || 'N/A',
        jobData.source_url || 'N/A',
        jobData.raw_text || '',
        'saved',
        jobData.source_method || 'manual'
      ]
		})
		
		return contextObj.json({ success: true, id: jobId }, 201)
	} catch (error) {
		console.error('Error saving job:', error)
		return contextObj.json({ error: 'Failed to save job' }, 500)
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
    
    // Parse the stack string back into an array for the frontend
    const jobs = result.rows.map(row => ({
      ...row,
      stack: JSON.parse(row.stack as string || '[]')
    }))

    return contextObj.json(jobs)
  } catch (e) {
    return contextObj.json({ error: 'Failed to fetch jobs' }, 500)
  }
})

export default app