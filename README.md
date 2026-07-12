# RoleSnap

**AI-powered job tracker.** Save jobs from WhatsApp, Telegram, Twitter/X, LinkedIn, or any website — RoleSnap parses unstructured text into structured job data and tracks your application pipeline on a Kanban dashboard.

---

## Prerequisites

- **Node.js** 18+
- **Wrangler CLI** (`npm install -g wrangler`)
- **Chrome** (for extension development)
- **Turso CLI** (for database management)
- Accounts: [Groq](https://console.groq.com), [Clerk](https://clerk.com), [Sentry](https://sentry.io), [Meta for Developers](https://developers.facebook.com) (WhatsApp bot)

---

## Project Structure

```
RoleSnap/
├── worker/          Cloudflare Worker — Hono API (AI parsing, database, webhooks)
├── dashboard/       React + Vite + Tailwind — Kanban dashboard (Vercel)
├── extension/       Chrome Extension — right-click save + side panel
└── docs/            Architecture decisions, known issues, roadmap
```

---

## How to Run Locally

### 1. Worker (Backend API)

```bash
cd worker
npm install
```

Create a `.dev.vars` file in `worker/` with the following environment variables (see [docs/worker.md](docs/worker.md) for descriptions):

```env
GROQ_API_KEY=your_groq_key
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_turso_token
SENTRY_DSN=your_sentry_dsn
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_GRAPH_API_VERSION=v25.0
DASHBOARD_URL=http://localhost:5173
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

Start the dev server:

```bash
npm run dev
```

The API will be available at `http://localhost:8787`.

### 2. Dashboard (Frontend)

```bash
cd dashboard
npm install
```

Create a `.env` file in `dashboard/`:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_BASE_URL=http://localhost:8787
```

Start the dev server:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

### 3. Chrome Extension

```bash
cd extension
npm install
npm run build
```

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load unpacked** and select `extension/dist/`
4. The extension icon will appear in the toolbar

---

## How to Run Tests

### Unit Tests (Worker)

```bash
cd worker
npm test
```

Uses Vitest with `@cloudflare/vitest-pool-workers`.

### Integration Tests (AI Parser)

```bash
cd worker
node run-tests.mjs
```

Sends all 20+ test samples from `worker/test-samples/` to the live `/api/parse` endpoint and saves results to `worker/test-results/`.

---

## Environment Variables Reference

| Variable | Where | Required For |
|---|---|---|
| `GROQ_API_KEY` | Worker `.dev.vars` | AI job parsing |
| `TURSO_DATABASE_URL` | Worker `.dev.vars` | Database connection |
| `TURSO_AUTH_TOKEN` | Worker `.dev.vars` | Database authentication |
| `SENTRY_DSN` | Worker `.dev.vars` | Error tracking |
| `WHATSAPP_VERIFY_TOKEN` | Worker `.dev.vars` | WhatsApp webhook verification |
| `WHATSAPP_PHONE_NUMBER_ID` | Worker `.dev.vars` | WhatsApp message sending |
| `WHATSAPP_ACCESS_TOKEN` | Worker `.dev.vars` | WhatsApp API authentication |
| `WHATSAPP_GRAPH_API_VERSION` | Worker `.dev.vars` | WhatsApp API version (default: v25.0) |
| `DASHBOARD_URL` | Worker `.dev.vars` | Job links in WhatsApp replies |
| `CLERK_PUBLISHABLE_KEY` | Worker `.dev.vars` + Dashboard `.env` | Authentication |
| `CLERK_SECRET_KEY` | Worker `.dev.vars` | Clerk API calls |
| `VITE_CLERK_PUBLISHABLE_KEY` | Dashboard `.env` | Clerk frontend |
| `VITE_API_BASE_URL` | Dashboard `.env` | API endpoint (default: live Worker URL) |

---

## Deployment

### Worker

```bash
cd worker
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put TURSO_DATABASE_URL
# ... repeat for all secrets above
npm run deploy
```

### Dashboard

Push to GitHub and connect the `dashboard/` folder to [Vercel](https://vercel.com). Set the environment variables in the Vercel dashboard.

### Extension

Build with `npm run build`, then zip the `dist/` folder and upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend API | Cloudflare Workers + Hono | Edge compute, 100k req/day free |
| AI Parsing | Groq (Llama 3.3 70B) | <1s responses, free tier |
| Database | Turso (libSQL) | Edge replication, 9GB free |
| Auth | Clerk | 10k users free, Hono middleware |
| Frontend | React + Vite + Tailwind | Fast dev, Vercel deploy |
| Error Tracking | Sentry | 5k errors/month free |
| WhatsApp Bot | Meta Cloud API | 1k conversations/month free |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed reasoning behind each choice.