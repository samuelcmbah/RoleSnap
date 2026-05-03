import { Hono } from "hono"
import { cors } from "hono/cors"
import { sentry } from '@hono/sentry'
import { Bindings } from "./shared/types/Bindings"
import { errorHandler } from "./interfaces/http/middleware/errorHandler"
import { parseRoute } from "./interfaces/http/routes/parse.route"
import { jobsRoute } from "./interfaces/http/routes/jobs.route"

const app = new Hono<{ Bindings: Bindings }>()

// This middleware catches all unhandled exceptions
app.use('*', async (c, next) => {
  const sentryHandler = sentry({ dsn: c.env.SENTRY_DSN });
  return sentryHandler(c, next);
})

app.use('*', errorHandler)
app.use('/api/*', cors())

app.get('/', (c) => {
	return c.text('RoleSnap API is running!')
})

app.route('/api/parse', parseRoute)
app.route('/api/jobs', jobsRoute)

export default app