import { Hono } from 'hono'
import { getSentry } from '@hono/sentry'
import { Toucan } from 'toucan-js'
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

type WebhookErrorReporter = Toucan

const maskPhoneNumber = (value?: string) => {
  if (!value) return 'missing'
  return value.length <= 4 ? '****' : `****${value.slice(-4)}`
}

const logWebhookDebug = (
  requestId: string,
  event: string,
  details: Record<string, unknown> = {}
) => {
  console.log(`[webhook:${requestId}] ${event}`, JSON.stringify(details))
}

const captureWebhookException = (
  sentry: WebhookErrorReporter | undefined,
  err: unknown,
  requestId: string,
  stage: string,
  details: Record<string, unknown> = {}
) => {
  if (!sentry) return

  sentry.withScope((scope) => {
    scope.setTag('feature', 'whatsapp_webhook')
    scope.setTag('webhook_stage', stage)
    scope.setContext('whatsapp_webhook', {
      requestId,
      ...details
    })
    scope.captureException(err)
  })
}

const summarizeWhatsAppPayload = (payload: WhatsAppWebhookPayload) => {
  const entries = payload.entry ?? []
  const changes = entries.flatMap((entry) => entry.changes ?? [])
  const messages = changes.flatMap((change) => change.value?.messages ?? [])
  const statuses = changes.flatMap((change) => change.value?.statuses ?? [])

  return {
    entryCount: entries.length,
    changeCount: changes.length,
    messageCount: messages.length,
    messageTypes: messages.map((message) => message.type ?? 'unknown'),
    statusCount: statuses.length,
    statusTypes: statuses.map((status) => status.status ?? 'unknown')
  }
}

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
  text: string,
  requestId = 'manual'
) => {
  const graphVersion = env.WHATSAPP_GRAPH_API_VERSION || 'v25.0'
  logWebhookDebug(requestId, 'sending WhatsApp reply', {
    graphVersion,
    phoneNumberIdPresent: Boolean(env.WHATSAPP_PHONE_NUMBER_ID),
    accessTokenPresent: Boolean(env.WHATSAPP_ACCESS_TOKEN),
    to: maskPhoneNumber(to),
    textLength: text.length
  })

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
    logWebhookDebug(requestId, 'WhatsApp reply failed', {
      status: response.status,
      response: errorText
    })
    throw new Error(`WhatsApp reply failed: ${response.status} - ${errorText}`)
  }

  logWebhookDebug(requestId, 'WhatsApp reply sent', {
    status: response.status,
    to: maskPhoneNumber(to)
  })
}

export const processIncomingWhatsAppMessage = async (
  payload: WhatsAppWebhookPayload,
  env: Bindings,
  requestId = crypto.randomUUID(),
  sentry?: WebhookErrorReporter
) => {
  logWebhookDebug(requestId, 'background processing started', summarizeWhatsAppPayload(payload))

  const message = extractIncomingWhatsAppMessage(payload)

  if (!message) {
    logWebhookDebug(requestId, 'ignored webhook: no incoming user message found', summarizeWhatsAppPayload(payload))
    return
  }

  logWebhookDebug(requestId, 'incoming message extracted', {
    from: maskPhoneNumber(message.from),
    type: message.type,
    textLength: message.text?.length ?? 0
  })

  // Users may send stickers, images, or voice notes before text support exists.
  if (message.type !== 'text' || !message.text) {
    logWebhookDebug(requestId, 'unsupported message type', {
      from: maskPhoneNumber(message.from),
      type: message.type
    })

    await sendWhatsAppTextReply(
      env,
      message.from,
      'Please forward a text job post for now.',
      requestId
    ).catch((replyErr) => {
      console.error(`[webhook:${requestId}] WhatsApp unsupported-message reply failed:`, replyErr)
      captureWebhookException(sentry, replyErr, requestId, 'unsupported_message_reply', {
        messageType: message.type,
        to: maskPhoneNumber(message.from)
      })
    })
    return
  }

  try {
    logWebhookDebug(requestId, 'starting Groq parse', {
      textLength: message.text.length
    })

    const parser = new ParseJobText(new GroqClient(env.GROQ_API_KEY))
    const rawJobs = await parser.execute(message.text)

    logWebhookDebug(requestId, 'Groq parse completed', {
      jobCount: rawJobs.length
    })

    if (rawJobs.length === 0) {
      await sendWhatsAppTextReply(
        env,
        message.from,
        "That doesn't look like a job post. Try a job listing.",
        requestId
      )
      return
    }

    logWebhookDebug(requestId, 'creating database client')
    const db = getDbClient(env)
    const jobs = toSavedJobs(rawJobs, message.text, message.from)
    logWebhookDebug(requestId, 'saving parsed jobs', {
      jobCount: jobs.length,
      sourceMethod: 'whatsapp',
      userId: `whatsapp:${maskPhoneNumber(message.from)}`
    })

    const saveJobs = new SaveJobs(new JobRepository(db))
    const ids = await saveJobs.execute(jobs, `whatsapp:${message.from}`)
    logWebhookDebug(requestId, 'jobs saved', {
      count: ids.length,
      firstJobId: ids[0] ?? null
    })

    const dashboardUrl = env.DASHBOARD_URL || 'https://rolesnap.xyz'
    const firstJobUrl = `${dashboardUrl.replace(/\/$/, '')}/job/${ids[0]}`
    const reply = rawJobs.length === 1
      ? `Job saved! ${firstJobUrl}`
      : `${rawJobs.length} jobs saved! ${dashboardUrl.replace(/\/$/, '')}/jobs`

    await sendWhatsAppTextReply(env, message.from, reply, requestId)
  } catch (err) {
    console.error(`[webhook:${requestId}] WhatsApp webhook processing failed:`, err)
    captureWebhookException(sentry, err, requestId, 'process_message', {
      messageType: message.type,
      from: maskPhoneNumber(message.from),
      textLength: message.text.length
    })

    await sendWhatsAppTextReply(
      env,
      message.from,
      'Sorry, we had trouble reading that. Try again soon.',
      requestId
    ).catch((replyErr) => {
      console.error(`[webhook:${requestId}] WhatsApp failure reply failed:`, replyErr)
      captureWebhookException(sentry, replyErr, requestId, 'failure_reply', {
        originalFailure: err instanceof Error ? err.message : String(err),
        to: maskPhoneNumber(message.from)
      })
    })
  }
}

webhookRoute.get('/', (c) => {
  const requestId = crypto.randomUUID()
  const mode = c.req.query('hub.mode')
  const verifyToken = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')
  const tokenMatches = verifyToken === c.env.WHATSAPP_VERIFY_TOKEN

  logWebhookDebug(requestId, 'GET verification request received', {
    mode,
    tokenMatches,
    hasChallenge: Boolean(challenge)
  })

  if (mode === 'subscribe' && tokenMatches && challenge) {
    logWebhookDebug(requestId, 'GET verification succeeded')
    return c.text(challenge, 200)
  }

  logWebhookDebug(requestId, 'GET verification failed')
  return c.json({
    success: false,
    error: {
      message: 'Webhook verification failed',
      code: 'WEBHOOK_VERIFICATION_FAILED'
    }
  }, 403)
})

webhookRoute.post('/', async (c) => {
  const requestId = crypto.randomUUID()
  logWebhookDebug(requestId, 'POST webhook entered', {
    method: c.req.method,
    contentType: c.req.header('content-type') ?? null,
    userAgent: c.req.header('user-agent') ?? null
  })

  const payload = await c.req.json().catch(() => null)

  if (!payload) {
    logWebhookDebug(requestId, 'invalid JSON payload')
    return c.json({
      success: false,
      error: {
        message: 'Invalid webhook payload',
        code: 'INVALID_WEBHOOK_PAYLOAD'
      }
    }, 400)
  }

  logWebhookDebug(requestId, 'JSON payload parsed', summarizeWhatsAppPayload(payload))
  const sentry = getSentry(c)
  c.executionCtx.waitUntil(
    processIncomingWhatsAppMessage(payload, c.env, requestId, sentry).catch((err) => {
      console.error(`[webhook:${requestId}] unhandled waitUntil failure:`, err)
      captureWebhookException(sentry, err, requestId, 'wait_until')
    })
  )
  logWebhookDebug(requestId, 'background processing scheduled')

  return c.json({
    success: true,
    message: 'Webhook received'
  }, 200)
})
