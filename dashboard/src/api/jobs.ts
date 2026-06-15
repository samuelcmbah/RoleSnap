export type ParsedJob = {
  title: string
  company: string
  location: string
  salary: string
  requirements: string[]
  contact_info: string
  source_url: string
  raw_text: string
}

export type JobRecord = ParsedJob & {
  id: string
  status: string
  created_at: string
  snapshot_url?: string
  snapshot_type?: string
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    requestId?: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-worker.workers.dev'

const defaultHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const handleResponse = async <T>(response: Response) => {
  const result = (await response.json()) as ApiResponse<T>
  if (!response.ok) {
    const message = result.error?.message || 'Request failed'
    throw new Error(message)
  }
  if (!result.success) {
    throw new Error(result.error?.message || 'API returned unsuccessful response')
  }
  return result.data as T
}

export const parseJob = async (text: string, sourceUrl?: string, token?: string) => {
  const response = await fetch(`${API_BASE_URL}/api/parse`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify({ text, sourceUrl })
  })
  return handleResponse<ParsedJob[]>(response)
}

export const saveJob = async (job: ParsedJob, token?: string) => {
  const response = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: defaultHeaders(token),
    body: JSON.stringify(job)
  })
  return handleResponse<{ count: number; ids: string[] }>(response)
}

export const getJobs = async (token?: string) => {
  const response = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: 'GET',
    headers: defaultHeaders(token)
  })
  return handleResponse<JobRecord[]>(response)
}

export const updateJobStatus = async (id: string, status: string, token?: string) => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: defaultHeaders(token),
    body: JSON.stringify({ status })
  })
  return handleResponse<JobRecord>(response)
}

export const updateJobNotes = async (id: string, notes: string, token?: string) => {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${encodeURIComponent(id)}/notes`, {
    method: 'PATCH',
    headers: defaultHeaders(token),
    body: JSON.stringify({ notes })
  })
  return handleResponse<JobRecord>(response)
}
