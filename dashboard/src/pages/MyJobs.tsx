import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getJobs, updateJobStatus } from '../api/jobs'
import type { JobRecord } from '../api/jobs'
import { KanbanBoard, type JobStatus } from '../components/KanbanBoard'

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

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      const token = await getToken()
      
      // Optimistic update
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ))

      // API call
      await updateJobStatus(jobId, newStatus, token ?? undefined)
    } catch (err: any) {
      // Rollback on failure
      console.error('Failed to update job status:', err)
      // Refetch to get correct state
      const token = await getToken()
      const data = await getJobs(token ?? undefined)
      setJobs(data)
      throw err
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-80 h-96 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
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

  return (
    <div className="h-[calc(100vh-8rem)]">
      <KanbanBoard 
        jobs={jobs} 
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
