# RoleSnap Worker (Cloudflare API)

The backend service for RoleSnap, built with **Hono** and deployed on **Cloudflare Workers**. Handles AI job parsing, database operations, message-forward webhook processing, Clerk authentication, and email delivery via Resend.

---

## Folder Structure

```
worker/src/
├── index.ts                          Entry point (exports Hono app)
├── app.ts                            Hono app setup (middleware, routes)
│
├── domain/                           Business logic & types
│   ├── Job.ts                        Job type definition
│   └── prompts/
│       └── jobExtractionPrompt.ts    Groq system prompt for job parsing
│
├── application/use-cases/            Orchestration layer
│   ├── ParseJobText.ts               Calls Groq, validates, returns structured jobs
│   ├── SaveJob.ts                    Saves parsed jobs to database
│   └── GetJob.ts                     Retrieves jobs for a user
│
├── infrastructure/                   External service adapters
│   ├── ai/
│   │   └── GroqClient.ts             HTTP client for Groq API
│   └── db/
│       ├── DbClient.ts               Turso/libSQL client (singleton)
│       └── JobRepository.ts          Database operations (saveBatch, findByUser)
│
├── interfaces/                       HTTP layer
│   ├── ai/
│   │   └── GroqResponse.ts           Type for Groq API response
│   └── http/
│       ├── middleware/
│       │   ├── rateLimiter.ts        In-memory rate limiter (10 req/min/IP)
│       │   └── errorHandler.ts       Global error handler
│       └── routes/
│           ├── parse.route.ts        POST /api/parse
│           ├── jobs.route.ts         POST /api/jobs, GET /api/jobs
│           └── webhook.route.ts      GET /webhook, POST /webhook
│
└── shared/                           Shared utilities
    ├── errors/
    │   └── AppError.ts               Custom error class
    ├── types/
    │   ├── Bindings.ts               Environment variable types
    │   ├── ApiResponse.ts            API response types
    │   └── WhatsApp.ts               WhatsApp webhook payload types
    └── utils/
```

---

## API Endpoints

### POST /api/parse

Parse raw job text into structured JSON using Groq AI.

**Rate limit:** 10 requests per minute per IP
**Constraints:** Minimum 100 characters, maximum 5,000 characters
**Veto logic:** If AI determines text is NOT a job post, returns empty array `[]`

**Request:**
```json
{
  "text": "Hiring a Senior React dev at Kuda. Remote. Apply at hr@kuda.com",
  "sourceUrl": "https://whatsapp.com/..."
}
```

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "title": "Senior React Developer",
      "company": "Kuda",
      "location": "Remote",
      "salary": "N/A",
      "stack": ["React"],
      "contact_info": "hr@kuda.com",
      "source_url": "https://whatsapp.com/...",
      "raw_text": "..."
    }
  ]
}
```

**Validation error (400):**
```json
{
  "success": false,
  "error": {
    "message": "Text too short to be a valid job post",
    "code": "VALIDATION_ERROR",
    "requestId": "uuid"
  }
}
```

**Rate limited (429):**
```json
{
  "success": false,
  "error": {
    "message": "Too Many Requests: You can only parse 10 jobs per minute. Please wait.",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

---

### POST /api/jobs

Save parsed job(s) to the database. Requires Clerk authentication.

**Headers:** `Authorization: Bearer <clerk_token>`

**Request (single job):**
```json
{
  "title": "Senior React Developer",
  "company": "Kuda",
  "location": "Remote",
  "salary": "N/A",
  "stack": ["React"],
  "contact_info": "hr@kuda.com",
  "source_url": "https://...",
  "raw_text": "..."
}
```

**Request (multiple jobs):**
```json
{
  "data": [ ... ]
}
```

**Success (201):**
```json
{
  "success": true,
  "data": {
    "count": 1,
    "ids": ["uuid"]
  }
}
```

---

### GET /api/jobs

Get all jobs for the authenticated user. Requires Clerk authentication.

**Headers:** `Authorization: Bearer <clerk_token>`

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "user_abc123",
      "title": "Senior React Developer",
      "company": "Kuda",
      "status": "saved",
      "created_at": "2026-07-12T12:00:00Z",
      ...
    }
  ]
}
```

---

### GET /api/jobs/search

Search and filter saved jobs. Requires Clerk authentication.

**Headers:** `Authorization: Bearer <clerk_token>`

**Query params:** `?q=react&stack=React&location=Remote&status=saved`

**Success (200):**
```json
{
  "success": true,
  "data": [ ... ]
}
```

> **Note:** This endpoint is not yet implemented in the Worker. The dashboard API client will need a `searchJobs()` function when it's built.

---

### PATCH /api/jobs/:id/status

Update job status (triggered by Kanban drag-and-drop). Requires Clerk authentication.

**Headers:** `Authorization: Bearer <clerk_token>`

**Request:**
```json
{
  "status": "applied"
}
```

**Success (200):**
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "applied" }
}
```

> **Note:** This endpoint is not yet implemented in the Worker. The dashboard API client already has `updateJobStatus()` ready.

---

### PATCH /api/jobs/:id/notes

Update user's notes on a job. Requires Clerk authentication.

**Headers:** `Authorization: Bearer <clerk_token>`

**Request:**
```json
{
  "notes": "Called the recruiter, waiting for callback"
}
```

> **Note:** This endpoint is not yet implemented in the Worker. The dashboard API client already has `updateJobNotes()` ready.

---

### PATCH /api/jobs/:id/reminder

Set or clear a follow-up reminder date. Requires Clerk authentication.

**Headers:** `Authorization: Bearer <clerk_token>`

**Request:**
```json
{
  "follow_up_date": "2026-08-01T09:00:00Z"
}
```

To clear: send `"follow_up_date": null`.

> **Note:** This endpoint is not yet implemented in the Worker.

---

### POST /api/notifications/prefs

Update a user's notification preferences (email/WhatsApp opt-ins). Requires Clerk authentication.

**Headers:** `Authorization: Bearer <clerk_token>`

**Request:**
```json
{
  "email_reminders_opt_in": true,
  "weekly_digest_opt_in": false,
  "whatsapp_reminders_opt_in": true
}
```

> **Note:** This endpoint is not yet implemented in the Worker.

---

### POST /api/notifications/test

Send a test reminder email (for development/debugging). Requires Clerk authentication.

**Headers:** `Authorization: Bearer <clerk_token>`

> **Note:** This endpoint is not yet implemented in the Worker.

---

### GET /api/insights/salaries

Aggregated anonymous salary data by stack and location.

> **Note:** This endpoint is not yet implemented in the Worker.

---

### GET /webhook

WhatsApp webhook verification (called by Meta during setup).

**Query params:** `hub.mode`, `hub.verify_token`, `hub.challenge`

**Success (200):** Returns `hub.challenge` as plain text.

---

### POST /webhook

Receive incoming WhatsApp messages (called by Meta when user sends a message).

**Processing flow:**
1. Extract message text from Meta payload
2. Extract sender phone number
3. Call Groq parse on the message text
4. Save parsed jobs to Turso with `source_method: 'whatsapp'`
5. Reply to sender with job link via WhatsApp API
6. Handle non-text messages (stickers, images) with help text
7. Handle parse failures with graceful error message

All processing happens in `c.executionCtx.waitUntil()` — the webhook returns 200 immediately while processing continues in the background.

---

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key for AI parsing |
| `TURSO_DATABASE_URL` | Turso database URL (libsql://...) |
| `TURSO_AUTH_TOKEN` | Turso authentication token |
| `SENTRY_DSN` | Sentry DSN for error tracking |
| `WHATSAPP_VERIFY_TOKEN` | Custom token for Meta webhook verification |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Business phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp permanent access token |
| `WHATSAPP_GRAPH_API_VERSION` | Meta Graph API version (default: v25.0) |
| `RESEND_API_KEY` | Resend API key for email delivery |
| `DASHBOARD_URL` | Dashboard URL for job links in WhatsApp replies |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

---

## Known Issues

### 1. Missing PATCH Endpoints
The dashboard's API client already has functions for `updateJobStatus()` and `updateJobNotes()`, but the Worker does not have these routes implemented:
- `PATCH /api/jobs/:id/status` — needed for Kanban drag-and-drop
- `PATCH /api/jobs/:id/notes` — needed for auto-saving notes

### 2. Missing Reminder Endpoints
- `PATCH /api/jobs/:id/reminder` — not implemented
- `POST /api/notifications/prefs` — not implemented
- `POST /api/notifications/test` — not implemented

### 3. Missing Search Endpoint
- `GET /api/jobs/search` — not implemented. Needed once users have 50+ saved jobs.

### 4. Missing Salary Insights Endpoint
- `GET /api/insights/salaries` — not implemented.

### 5. Missing Database Operations
The `JobRepository` only has `saveBatch` and `findByUser`. Missing:
- `updateStatus(jobId, newStatus)` — also needs to insert into `status_history`
- `updateNotes(jobId, notes)`
- `updateReminder(jobId, followUpDate)`
- `searchJobs(userId, params)` — filter by text, stack, location, status
- `findByFollowUpDate(date)` — for cron reminders
- `markNotified(jobId)` — mark follow_up_notified = true
- `upsertNotificationPrefs(userId, prefs)`
- `getNotificationPrefs(userId)`
- `insertShare(jobId, sharedVia)`
- The `status_history`, `shares`, and `notification_prefs` tables may not exist in Turso yet

### 6. wrangler.jsonc is Bare
The wrangler configuration is missing:
- Environment variable bindings (`vars` section)
- Cron trigger binding (for daily reminder checks and weekly digest)
- Service bindings

### 7. DbClient Singleton
`DbClient.ts` uses a module-level singleton (`let db = null`). In Cloudflare Workers, this persists across requests in the same isolate, which is fine. But if the environment variables change (e.g., different Turso URL per environment), the singleton won't reinitialize. Consider using a factory pattern instead.

### 8. Rate Limiter is In-Memory
The rate limiter uses a `Map<string, { count, lastReset }>` in memory. This means:
- Rate limits reset when the Worker restarts (new isolate)
- Rate limits are per-isolate, not global — a user hitting different edge locations could exceed the limit
- For production, consider using Cloudflare's built-in rate limiting or a Durable Object

---

## Next Steps

1. **Add PATCH routes** — `PATCH /api/jobs/:id/status` and `PATCH /api/jobs/:id/notes`
2. **Add status_history operations** — update `JobRepository` to insert into `status_history` on status change
3. **Add search endpoint** — `GET /api/jobs/search` with query params for text, stack, location, status
4. **Add reminder endpoints** — `PATCH /api/jobs/:id/reminder`, `POST /api/notifications/prefs`, `POST /api/notifications/test`
5. **Add Resend email helper** — `sendEmail(to, subject, body)` using Resend API
6. **Add Cloudflare Cron Trigger** — daily check for due reminders, weekly digest
7. **Add salary insights endpoint** — `GET /api/insights/salaries`
8. **Add shares endpoint** — `POST /api/shares` for viral analytics
9. **Configure wrangler.jsonc** — add environment variable bindings and cron triggers
10. **Write unit tests** — Vitest is installed but only has a placeholder test