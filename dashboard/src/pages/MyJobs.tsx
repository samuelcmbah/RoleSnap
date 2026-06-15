import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getJobs } from '../api/jobs'
import type { JobRecord } from '../api/jobs'

export const MyJobs = () => {
  const { getToken } = useAuth()
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = await getToken()
        const data = await getJobs(token ?? undefined)
        setJobs(data)
      } catch (err: any) {
        setError(err.message || 'Unable to load saved jobs')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [getToken])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-3xl bg-slate-200 animate-pulse" />
          <div className="h-40 rounded-3xl bg-slate-200 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Error loading jobs</p>
        <p className="mt-2">{error}</p>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-600 text-lg font-medium">No jobs saved yet.</p>
        <p className="mt-2 text-slate-500">Use the Chrome Extension, WhatsApp bot, or paste a job to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{job.status}</p>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{job.title}</h3>
                <p className="mt-1 text-slate-600">{job.company}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                {new Date(job.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p><strong>Location:</strong> {job.location}</p>
              <p><strong>Salary:</strong> {job.salary}</p>
              <p><strong>Contact:</strong> {job.contact_info}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {job.requirements?.slice(0, 5).map((skill) => (
                <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {skill}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
