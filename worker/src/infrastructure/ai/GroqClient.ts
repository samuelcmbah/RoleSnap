import { AppError } from "../../shared/errors/AppError"
import { GroqResponse } from "../../interfaces/ai/GroqResponse"

export class GroqClient {
	constructor(private apiKey: string) {}

	async parse(text: string, systemPrompt: string): Promise<GroqResponse> {
		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'llama-3.3-70b-versatile',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: text }
				],
				response_format: { type: "json_object" },
				temperature: 0.1
			})
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new AppError(`AI provider failed: ${response.status} - ${errorText}`, 'GROQ_ERROR', 502)
		}

		return response.json()
	}
}