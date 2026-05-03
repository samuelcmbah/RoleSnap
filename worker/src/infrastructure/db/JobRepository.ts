import { Job } from "../../domain/Job"
import { DbClient } from "./DbClient"

export class JobRepository {
  constructor(private db: DbClient) {}

  async saveBatch(jobs: Job[], userId: string) {
    if (!jobs.length) return

    const queries = jobs.map(job => ({
      sql: `INSERT INTO jobs (
        id, user_id, title, company, location, salary,
        requirements, contact_info, source_url, raw_text,
        status, source_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        userId,
        job.title ?? '',
        job.company ?? '',
        job.location ?? '',
        job.salary ?? '',
        JSON.stringify(job.requirements ?? []), 
        job.contact_info ?? '',
        job.source_url ?? '',
        job.raw_text ?? '',
        'saved',
        'manual'
      ]
    }))

    try {
      await this.db.batch(queries, "write") 
    } catch (err) {
      console.error("DB batch insert error:", err)
      throw err
    }
  }

  async findByUser(userId: string) {
    try {
      const result = await this.db.execute({
        sql: "SELECT * FROM jobs WHERE user_id = ?",
        args: [userId]
      })

      return result.rows ?? []
    } catch (err) {
      console.error("DB fetch error:", err)
      throw err
    }
  }
}