# RoleSnap Architecture

## System Overview

RoleSnap has three user-facing surfaces (Chrome Extension, Message-Forward Bot, Dashboard) that all feed into a single Cloudflare Worker API, which handles AI parsing via Groq and persists data to Turso (libSQL). Authentication is handled by Clerk across all surfaces. Email reminders are sent via Resend.

**Surfaces:**
- **Chrome Extension** — Right-click any selected text on any website to save a job
- **Message-Forward Bot** — Forward a job message to a WhatsApp number, it gets saved automatically
- **Dashboard** — Web app at rolesnap.xyz for viewing, managing, and tracking jobs on a Kanban board

**Backend:**
- **Cloudflare Worker (Hono)** — All API logic: parsing, database CRUD, webhook handling
- **Groq AI (Llama 3.3 70B)** — Extracts structured job data from unstructured text
- **Turso (libSQL)** — Edge-replicated database for fast reads anywhere
- **Clerk** — Authentication (Google OAuth + email/password)
- **Resend** — Email delivery for follow-up reminders and weekly digest

---

## Stack Decisions

### Why Cloudflare Workers + Hono?

| Factor | Decision |
|---|---|
| **Latency** | Cloudflare runs servers in Lagos, Johannesburg, and London. API responses under 100ms for users across Africa and Europe. |
| **Free tier** | 100k requests/day — enough for 1,000+ active users at $0. |
| **Deployment simplicity** | No server management. Push code, it's live globally in seconds. |
| **Why Hono over Express/Fastify** | Hono is built for edge runtimes (Workers, Deno, Bun). It's 14kB, has first-class TypeScript support, and native Worker bindings. Express doesn't run on Workers. |

### Why Groq AI?

| Factor | Decision |
|---|---|
| **Speed** | Groq's LPU (Language Processing Unit) architecture returns AI responses in under 1 second — critical for real-time parsing when a user right-clicks or forwards a message. |
| **Model quality** | Llama 3.3 70B (via Groq) handles messy, informal job posts well: mixed languages, inconsistent formatting, missing fields. |
| **Free tier** | 30 requests/minute — sufficient for early-stage usage. |
| **JSON mode** | Native `response_format: { type: "json_object" }` support makes structured extraction reliable. |

### Why Turso (libSQL)?

| Factor | Decision |
|---|---|
| **Edge replication** | Turso replicates your database to edge locations worldwide. Jobs load fast regardless of user location. |
| **Free tier** | 9GB storage — <100MB for 10,000 jobs. Effectively free forever at early scale. |
| **SQL compatibility** | Full SQL support via libSQL (SQLite-compatible). No new query language to learn. |
| **Why not Postgres?** | Postgres has no free managed edge tier. Neon has 0.5GB free; Supabase has 500MB. Turso offers 9GB and lower latency for reads. |

### Why Clerk?

| Factor | Decision |
|---|---|
| **Free tier** | 10,000 users — your first year is free. |
| **Hono middleware** | `@clerk/hono` provides `clerkMiddleware()` and `getAuth()` — drops into existing Hono routes in 2 lines. |
| **Extension support** | Clerk works in browsers (for the dashboard) and can be relayed to Chrome extensions via postMessage/iframe bridge. |
| **Social login** | Google OAuth out of the box — reduces sign-up friction. |

### Why Resend?

| Factor | Decision |
|---|---|
| **Free tier** | 3,000 emails/month — covers reminder emails and weekly digests through the first thousand users. |
| **API simplicity** | Single `fetch` call to send an email. No SDK required, no complex setup. |
| **Why not SendGrid/Mailgun?** | Resend's free tier is more generous for early-stage volume, and the API is significantly simpler. |

### Why Vercel?

| Factor | Decision |
|---|---|
| **Free tier** | 100GB bandwidth — more than enough for a dashboard serving 1,000 users. |
| **Auto-deploy** | Every push to GitHub `main` deploys automatically. Zero DevOps. |
| **Environment variables** | Easy management of Clerk publishable key and API base URL per environment. |

### Why Sentry?

Free tier: 5,000 errors/month. Essential for catching Groq outages, database failures, and WhatsApp webhook crashes in production.

---

## Clerk Auth Flow

### How the Chrome Extension Gets Authenticated

Chrome extensions can't use Clerk directly (service workers have no DOM, no cookies, no redirects). The solution is a **hidden iframe token relay**:

1. Extension background.ts calls `getClerkToken()`
2. TokenRelay component (in extension UI) loads a hidden iframe to `https://rolesnap.xyz/extension-auth`
3. The `/extension-auth` page runs Clerk in a real browser context
4. If user is signed in: `getToken()` → `postMessage` back to extension
5. If user is not signed in: shows Clerk `<SignIn />` component
6. TokenRelay stores the token in `chrome.storage.local`
7. background.ts polls `chrome.storage.local` until token arrives (or timeout)
8. background.ts uses token in `Authorization` header for `/api/jobs` POST

### Worker Authentication Flow

1. Request hits `/api/jobs/*`
2. `clerkMiddleware()` extracts the Clerk session from the `Authorization` header
3. `getAuth(c)` returns the `userId`
4. Worker uses `userId` to query/filter jobs in Turso
5. Unauthenticated requests get 401 Unauthorized

### Dashboard Authentication Flow

1. `ClerkProvider` wraps the entire React app
2. `AuthGuard` checks `useAuth().isSignedIn`
3. If not signed in: redirect to `/login`
4. If signed in: show Layout with sidebar + Outlet
5. API calls use `getToken()` to get a JWT, passed in `Authorization` header

---

## Data Flow: Saving a Job

All three sources (extension, message-forward bot, dashboard) follow the same pipeline:

`Raw Text → Groq AI Parse → Structured JSON → Save to Turso → Return Job ID`

### Extension
1. User selects text → right-click → "Save Job to RoleSnap"
2. Background script sends text to `POST /api/parse`
3. Gets back structured JSON
4. Gets Clerk token from TokenRelay
5. Sends parsed job + token to `POST /api/jobs`
6. Shows success in side panel

### Message-Forward Bot
1. User forwards message to WhatsApp number
2. Meta sends webhook to `POST /webhook`
3. Worker extracts text from Meta payload
4. Calls Groq parse (same as extension)
5. Saves to Turso with `source_method: 'whatsapp'`
6. Replies with job link via WhatsApp API

### Dashboard (Paste Job)
1. User clicks "Paste Job" in navbar
2. Types/pastes job text in modal
3. Dashboard calls `POST /api/parse`
4. If parsing succeeds, calls `POST /api/jobs`
5. Shows success toast, closes modal

---

## Database Schema

### jobs (Primary Table)

| Column | Type | Purpose |
|---|---|---|
| id | UUID PRIMARY KEY | Unique job ID |
| user_id | TEXT NOT NULL | Clerk user ID or "whatsapp:{phone}" |
| title | TEXT | Job title (AI-extracted) |
| company | TEXT | Company name (AI-extracted) |
| location | TEXT | Location (AI-extracted) |
| salary | TEXT | Salary range (AI-extracted) |
| stack | TEXT[] | Array of tech skills, e.g. [React, Node.js] |
| contact_info | TEXT | Email/phone from post |
| source_url | TEXT | Where the job came from, if any |
| raw_text | TEXT | Original pasted/forwarded text — NEVER delete this |
| status | TEXT | saved, applied, interview, offer, rejected |
| notes | TEXT | User's private notes on this job |
| follow_up_date | TIMESTAMP | Reminder date set by user |
| follow_up_notified | BOOLEAN | Whether a reminder has already fired |
| source_method | TEXT | 'extension', 'whatsapp', or 'manual' |
| created_at | TIMESTAMP | Auto-set when job is saved |

### status_history

| Column | Type | Purpose |
|---|---|---|
| id | UUID PRIMARY KEY | Unique ID |
| job_id | UUID NOT NULL | Links to jobs table |
| old_status | TEXT | Previous column |
| new_status | TEXT NOT NULL | New column |
| changed_at | TIMESTAMP | When it was moved |

### shares

| Column | Type | Purpose |
|---|---|---|
| id | UUID PRIMARY KEY | Unique ID |
| job_id | UUID NOT NULL | Which job was shared |
| shared_via | TEXT | 'whatsapp', 'twitter', or 'copy' |
| shared_at | TIMESTAMP | When it was shared |

### notification_prefs

| Column | Type | Purpose |
|---|---|---|
| user_id | TEXT PRIMARY KEY | Links to Clerk user |
| email | TEXT | User's email, from Clerk |
| email_reminders_opt_in | BOOLEAN | Follow-up reminder emails |
| weekly_digest_opt_in | BOOLEAN | Weekly summary email |
| whatsapp_reminders_opt_in | BOOLEAN | Follow-up reminders via WhatsApp |

---

## Deferred Features

The following features were considered but deferred until real users ask for them:

- **Public Community Job Board** — Competes directly with LinkedIn, Jobberman, Indeed. Not a defensible moat for RoleSnap.
- **AI Natural-Language Search** — Filter-based search covers the MVP. AI search can be added later if users with 200+ jobs need it.
- **Screenshot / Snapshot Preservation** — Removed entirely. Adds significant complexity (Browser Rendering, R2) for limited value — `raw_text` preserves all original data.
- **Saved-Search Email Alerts** — Natural extension once search and email reminders are stable, but not before.