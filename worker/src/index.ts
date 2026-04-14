import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('RoleSnap API is running!')
})

export default app