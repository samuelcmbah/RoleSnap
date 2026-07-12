# RoleSnap Worker (Cloudflare API)

The backend service for RoleSnap, built with **Hono** and deployed on **Cloudflare Workers**. Handles AI job parsing, database operations, WhatsApp webhook processing, and Clerk authentication.

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
  "text": "Hiring a Senior React dev at Kuda. ₦1.2M/mo. Remote. Apply at hr@kuda.com",
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
      "salary": "₦1.2M/month",
      "requirements": ["React"],
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
  "salary": "₦1.2M/month",
  "requirements": ["React"],
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
| `DASHBOARD_URL` | Dashboard URL for job links in WhatsApp replies |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

---

## Known Issues

### 1. Missing PATCH Endpoints
The dashboard's API client (`dashboard/src/api/jobs.ts`) already has functions for `updateJobStatus()` and `updateJobNotes()`, but the Worker does not have these routes implemented:
- `PATCH /api/jobs/:id/status` — needed for Kanban drag-and-drop
- `PATCH /api/jobs/:id/notes` — needed for auto-saving notes

### 2. Missing Database Tables
The `JobRepository` only has `saveBatch` and `findByUser`. Missing:
- `updateStatus(jobId, newStatus)` — also needs to insert into `status_history`
- `updateNotes(jobId, notes)`
- `findStatusHistory(jobId)`
- `insertShare(jobId, sharedVia)`
- The `status_history` and `shares` tables may not exist in Turso yet

### 3. wrangler.jsonc is Bare
The wrangler configuration is missing:
- Environment variable bindings (`vars` section)
- R2 bucket binding (for deprecated snapshot feature)
- Browser Rendering binding (for deprecated snapshot feature)
- Cron trigger binding (for follow-up reminders)
- Service bindings

### 4. DbClient Singleton
`DbClient.ts` uses a module-level singleton (`let db = null`). In Cloudflare Workers, this persists across requests in the same isolate, which is fine. But if the environment variables change (e.g., different Turso URL per environment), the singleton won't reinitialize. Consider using a factory pattern instead.

### 5. Rate Limiter is In-Memory
The rate limiter uses a `Map<string, { count, lastReset }>` in memory. This means:
- Rate limits reset when the Worker restarts (new isolate)
- Rate limits are per-isolate, not global — a user hitting different edge locations could exceed the limit
- For production, consider using Cloudflare's built-in rate limiting or a Durable Object

### 6. No Public Endpoints
The following endpoints from the roadmap are not implemented:
- `GET /api/jobs/public` — public job board feed
- `GET /api/insights/salaries` — aggregated salary data
- `POST /api/shares` — track shares

---

## Next Steps

1. **Add PATCH routes** — `PATCH /api/jobs/:id/status` and `PATCH /api/jobs/:id/notes`
2. **Add status_history operations** — update `JobRepository` to insert into `status_history` on status change
3. **Configure wrangler.jsonc** — add environment variable bindings
4. **Add shares endpoint** — `POST /api/shares` for viral analytics
5. **Add public jobs endpoint** — `GET /api/jobs/public` for community board
6. **Add salary insights endpoint** — `GET /api/insights/salaries`
7. **Write unit tests** — Vitest is installed but only has a placeholder test