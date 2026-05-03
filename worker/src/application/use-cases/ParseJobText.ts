import { GroqClient } from "../../infrastructure/ai/GroqClient"
import { GroqResponse } from "../../interfaces/ai/GroqResponse"
import { AppError } from "../../shared/errors/AppError"
import { jobExtractionPrompt } from "../../domain/prompts/jobExtractionPrompt"


export class ParseJobText {
	constructor(private ai: GroqClient) {}

	async execute(text: string) {
		if (!text || text.trim().length < 100) {
			throw new AppError('Text too short', 'VALIDATION_ERROR', 400)
		}

		const result: GroqResponse = await this.ai.parse(text, jobExtractionPrompt)

		const content = JSON.parse(result.choices[0]?.message?.content || '{"jobs": []}')

		return content.jobs || []
	}
}