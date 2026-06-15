import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@clerk/hono'
import { Bindings } from '../../../shared/types/Bindings'
import { getDbClient } from '../../../infrastructure/db/DbClient'
import { JobRepository } from '../../../infrastructure/db/JobRepository'
import { SaveJobs } from '../../../application/use-cases/SaveJob'
import { GetJobs } from '../../../application/use-cases/GetJob'
import { AppError } from '../../../shared/errors/AppError'

export const jobsRoute = new Hono<{ Bindings: Bindings }>()

jobsRoute.use('*', clerkMiddleware())

jobsRoute.post('/', async (c) => {
  const requestId = crypto.randomUUID()
  console.log('Received job save request with ID:', requestId)
  try {
    const db = getDbClient(c.env)
    console.log('Created DB client for request ID:', requestId)

    const jobData = await c.req.json().catch((err: any) => {
      console.error('Invalid JSON payload for request ID:', requestId, err)
      throw new AppError('Invalid JSON payload', 'INVALID_JSON', 400)
    })
    const auth = getAuth(c)
    const userId = auth?.userId
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401)
    }

    const jobsArray = Array.isArray(jobData)
      ? jobData
      : Array.isArray(jobData?.data)
        ? jobData.data
        : [jobData]
    console.log(`Parsed ${jobsArray.length} jobs from request ID:`, requestId)
    const useCase = new SaveJobs(new JobRepository(db))
    const ids = await useCase.execute(jobsArray, userId)
    console.log(`Successfully saved ${jobsArray.length} jobs for request ID:`, requestId)
    return c.json({
      success: true,
      data: { count: jobsArray.length, ids }
    }, 201)

  } catch (err: any) {
    console.error('Job save exception for request ID:', requestId, err)

    if (err instanceof AppError) {
      return c.json({
        success: false,
        error: {
          message: err.message,
          code: err.code,
          requestId
        }
      }, { status: err.statusCode as any })
    }

    return c.json({
      success: false,
      error: {
        message: err?.message || 'Failed to save jobs',
        code: 'SAVE_ERROR',
        requestId
      }
    }, 500)
  }
})

jobsRoute.get('/', async (c) => {
  const requestId = crypto.randomUUID()

  try {
    const db = getDbClient(c.env)
    const auth = getAuth(c)
    const userId = auth?.userId
    if (!userId) {
      throw new AppError('Unauthorized', 'AUTH_REQUIRED', 401)
    }

    const useCase = new GetJobs(new JobRepository(db))
    const jobs = await useCase.execute(userId)

    return c.json({
      success: true,
      data: jobs
    })

  } catch (err: any) {
    console.error('Fetch jobs exception for request ID:', requestId, err)
    if (err instanceof AppError) {
      return c.json({
        success: false,
        error: {
          message: err.message,
          code: err.code,
          requestId
        }
      }, { status: err.statusCode as any })
    }

    return c.json({
      success: false,
      error: {
        message: 'Failed to fetch jobs',
        code: 'FETCH_ERROR',
        requestId
      }
    }, 500)
  }
})
