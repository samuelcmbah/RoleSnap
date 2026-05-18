import { Job } from "../../domain/Job"
import { JobRepository } from "../../infrastructure/db/JobRepository"

export class SaveJobs {
	constructor(private repo: JobRepository) {}

	async execute(jobs: Job[], userId: string) {
		if (!jobs.length) return []

		return this.repo.saveBatch(jobs, userId)
	}
}
