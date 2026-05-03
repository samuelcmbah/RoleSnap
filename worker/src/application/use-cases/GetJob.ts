import { JobRepository } from "../../infrastructure/db/JobRepository"
import { Job } from "../../domain/Job"

export class GetJobs {
	constructor(private repo: JobRepository) {}

	async execute(userId: string): Promise<Job[]> {
		const rows = await this.repo.findByUser(userId)
		return rows.map((row: any) => ({
			...row,
			requirements: JSON.parse((row.requirements as string) || '[]')
		})) as Job[]
	}
}