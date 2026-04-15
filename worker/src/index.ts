import { Hono } from 'hono'


// defines the expected shape of the environment variables
type Bindings = {
	GROQ_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

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
export default app