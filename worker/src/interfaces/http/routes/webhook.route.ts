import { Hono } from 'hono'
import { Bindings } from '../../../shared/types/Bindings'
import { GroqClient } from '../../../infrastructure/ai/GroqClient'
import { ParseJobText } from '../../../application/use-cases/ParseJobText'
import { getDbClient } from '../../../infrastructure/db/DbClient'
import { JobRepository } from '../../../infrastructure/db/JobRepository'
import { SaveJobs } from '../../../application/use-cases/SaveJob'
import { Job } from '../../../domain/Job'
import {
  IncomingWhatsAppMessage,
  WhatsAppWebhookPayload
} from '../../../shared/types/WhatsApp'

export const webhookRoute = new Hono<{ Bindings: Bindings }>()

export const extractIncomingWhatsAppMessage = (
  payload: WhatsAppWebhookPayload
): IncomingWhatsAppMessage | null => {
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

  if (!message?.from || !message.type) {
    return null
  }

  return {
    from: message.from,
    type: message.type,
    text: message.text?.body?.trim()
  }
}

const toSavedJobs = (rawJobs: any[], text: string, sender: string): Job[] => {
  return rawJobs.map((job) => ({
    title: job.title || 'N/A',
    company: job.company || 'N/A',
    location: job.location || 'N/A',
    salary: job.salary || 'N/A',
    requirements: Array.isArray(job.requirements)
      ? job.requirements
      : Array.isArray(job.stack)
        ? job.stack
        : [],
    contact_info: job.contact_info || 'N/A',
    source_url: `whatsapp:${sender}`,
    raw_text: text,
    source_method: 'whatsapp'
  }))
}

export const sendWhatsAppTextReply = async (
  env: Bindings,
  to: string,
  text: string
) => {
  const graphVersion = env.WHATSAPP_GRAPH_API_VERSION || 'v18.0'
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: text
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`WhatsApp reply failed: ${response.status} - ${errorText}`)
  }
}

export const processIncomingWhatsAppMessage = async (
  payload: WhatsAppWebhookPayload,
  env: Bindings
) => {
  const message = extractIncomingWhatsAppMessage(payload)

  if (!message) {
    console.log('WhatsApp webhook ignored: no user message found')
    return
  }

  // Users may send stickers, images, or voice notes before text support exists.
  if (message.type !== 'text' || !message.text) {
    await sendWhatsAppTextReply(
      env,
      message.from,
      'Please forward a text job post for now.'
    ).catch((replyErr) => {
      console.error('WhatsApp unsupported-message reply failed:', replyErr)
    })
    return
  }

  try {
    const parser = new ParseJobText(new GroqClient(env.GROQ_API_KEY))
    const rawJobs = await parser.execute(message.text)

    if (rawJobs.length === 0) {
      await sendWhatsAppTextReply(
        env,
        message.from,
        "That doesn't look like a job post. Try a job listing."
      )
      return
    }

    const db = getDbClient(env)
    const jobs = toSavedJobs(rawJobs, message.text, message.from)
    const saveJobs = new SaveJobs(new JobRepository(db))
    const ids = await saveJobs.execute(jobs, `whatsapp:${message.from}`)
    const dashboardUrl = env.DASHBOARD_URL || 'https://rolesnap.xyz'
    const firstJobUrl = `${dashboardUrl.replace(/\/$/, '')}/job/${ids[0]}`
    const reply = rawJobs.length === 1
      ? `Job saved! ${firstJobUrl}`
      : `${rawJobs.length} jobs saved! ${dashboardUrl.replace(/\/$/, '')}/jobs`

    await sendWhatsAppTextReply(env, message.from, reply)
  } catch (err) {
    console.error('WhatsApp webhook processing failed:', err)
    await sendWhatsAppTextReply(
      env,
      message.from,
      'Sorry, we had trouble reading that. Try again soon.'
    ).catch((replyErr) => {
      console.error('WhatsApp failure reply failed:', replyErr)
    })
  }
}

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

  console.log('WhatsApp webhook received')
  c.executionCtx.waitUntil(processIncomingWhatsAppMessage(payload, c.env))

  return c.json({
    success: true,
    message: 'Webhook received'
  }, 200)
})
