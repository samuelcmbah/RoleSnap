import { Hono } from 'hono'
import { Bindings } from '../../../shared/types/Bindings'

export const webhookRoute = new Hono<{ Bindings: Bindings }>()

webhookRoute.get('/', (c) => {
  const mode = c.req.query('hub.mode')
  const verifyToken = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')

  if (mode === 'subscribe' && verifyToken === c.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return c.text(challenge, 200)
  }

  return c.json({
    success: false,
    error: {
      message: 'Webhook verification failed',
      code: 'WEBHOOK_VERIFICATION_FAILED'
    }
  }, 403)
})

webhookRoute.post('/', async (c) => {
  const payload = await c.req.json().catch(() => null)

  if (!payload) {
    return c.json({
      success: false,
      error: {
        message: 'Invalid webhook payload',
        code: 'INVALID_WEBHOOK_PAYLOAD'
      }
    }, 400)
  }

  console.log('WhatsApp webhook payload:', JSON.stringify(payload))

  return c.json({
    success: true,
    message: 'Webhook received'
  }, 200)
})
