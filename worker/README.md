# RoleSnap API (Worker)

This is the backend service for RoleSnap, built with **Hono** and deployed on **Cloudflare Workers**. It leverages **Groq AI** for job extraction, **Turso** for edge database storage, and **Sentry** for error monitoring.

---

## 🚀 Setup & Development

### 1. Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-cli/) installed.
- A Turso database created.
- A Groq API key.

### 2. Environment Variables

Create a `.dev.vars` file in the root of the `/worker` directory for local development:

```env
GROQ_API_KEY=your_groq_key_here
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your_auth_token_here
SENTRY_DSN=your_sentry_dsn_here
```

### 3. Run Locally

```bash
npm run dev
```

### 4. Deploy to Production

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put SENTRY_DSN
npm run deploy
```

---

## 🛠 API Reference

### 1. Parse Job Text

`POST /api/parse`

Converts messy, unstructured text into a clean JSON array of jobs.

- **Rate Limit:** 10 requests per minute per IP.
- **Constraints:** Minimum 100 characters, Maximum 5,000 characters.
- **Veto Logic:** If the AI determines the text is NOT a job post, it returns an empty array `[]`.

**Request Body:**

```json
{
  "text": "Hiring a Senior React dev at Kuda. ₦1.2M/mo. Remote. Apply at hr@kuda.com",
  "sourceUrl": "https://whatsapp.com/..."
}
```

**Success Response `(200 OK)`:**

```json
[
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
```

---

### 2. Save Job(s)

`POST /api/jobs`

Inserts parsed job data into the Turso database. Currently hardcoded to `user-123`.

**Request Body:** Accepts a single job object or an array of jobs (as returned by `/api/parse`).

---

### 3. List Saved Jobs

`GET /api/jobs`

Returns all jobs saved for the current user, ordered by most recent.

---

## 🛡️ Safety Features

| Feature | Description |
|---|---|
| **Input Validation** | Rejects junk text under 100 characters to save AI costs. |
| **Rate Limiting** | Protects Groq free-tier quotas from abuse. |
| **AI Veto** | Uses a high-reasoning model (Llama 3.3 70B) to verify if text is actually a job before extraction. |
| **Error Tracking** | All API crashes and AI provider failures are logged to Sentry. |