# RoleSnap Roadmap

## Current Status

**Phase:** End of Phase 1 (Capture Layer) / Start of Phase 2 (Dashboard)
**Last worked on:** ~3 weeks ago
**Next milestone:** Kanban board with drag-and-drop

---

## ✅ Completed

### Phase 1 — Capture Layer (Weeks 1-6)

| Week | Milestone | Status |
|---|---|---|
| Week 1 | Cloudflare Worker + Turso DB + Groq API all working and deployed | ✅ |
| Week 2 | AI parser handles 90%+ of real job posts correctly, Sentry active | ✅ |
| Week 3 | Chrome Extension context menu working on WhatsApp Web and LinkedIn | ✅ |
| Week 4 | Extension sends text to API, saves job, shows success popup | ✅ |
| Week 5 | WhatsApp bot webhook receiving messages and saving jobs to Turso | ✅ |
| Week 6 | WhatsApp bot replies with job link, tested by 3 real users | ✅ |

### Phase 2 — Dashboard (Weeks 7-8, partial)

| Week | Milestone | Status |
|---|---|---|
| Week 7 | React dashboard deployed on Vercel with live data from Worker API | ✅ |
| Week 8 | Clerk auth working (Google + email), protected routes in place | ✅ |
| Week 8 | Paste Job modal working (parse + save) | ✅ |
| Week 8 | My Jobs list view with loading/empty/error states | ✅ |
| Week 8 | Extension auth bridge (hidden iframe token relay) | ✅ |

---

## 🔄 In Progress / Next Up

### Phase 2 — Dashboard (Weeks 9-12)

| Week | Milestone | Priority | Dependencies |
|---|---|---|---|
| **Week 9** | **Kanban board with drag-and-drop** | 🔴 HIGH | Worker PATCH endpoints |
| **Week 9** | **Worker: PATCH /api/jobs/:id/status** | 🔴 HIGH | None |
| **Week 9** | **Worker: PATCH /api/jobs/:id/notes** | 🔴 HIGH | None |
| Week 10 | Optimistic updates + rollback on drag | 🟡 MEDIUM | Kanban board |
| Week 11 | Job detail side panel (slide-in) | 🟡 MEDIUM | Kanban board |
| Week 11 | Auto-saving notes field | 🟡 MEDIUM | PATCH notes endpoint |
| Week 11 | Status history timeline | 🟢 LOW | status_history table |
| Week 12 | Forward to Friend WhatsApp share button | 🟡 MEDIUM | Job detail panel |
| Week 12 | Share tracking (POST /api/shares) | 🟢 LOW | Share button |

### Phase 3 — Screenshots + Social (Weeks 13-18)

| Week | Milestone | Status |
|---|---|---|
| Weeks 13-14 | **⚠️ DEPRECATED — Snapshot feature** | ❌ Cancelled |
| Week 15 | Snapshot viewer modal | ❌ Cancelled |
| Week 16 | Public Community Job Board at /jobs | 🟡 MEDIUM |
| Week 16 | "Save to My Tracker" conversion funnel | 🟡 MEDIUM |
| Week 17 | Salary Insights page with charts | 🟢 LOW |
| Week 18 | Follow-up reminders (WhatsApp + dashboard) | 🟢 LOW |

### Phase 4 — Launch & Scale (Weeks 19-24)

| Week | Milestone | Status |
|---|---|---|
| Week 19 | Demo mode with pre-loaded sample jobs | 🟢 LOW |
| Week 19 | Lighthouse >90 optimization | 🟢 LOW |
| Week 20 | Landing page | 🟢 LOW |
| Week 20 | Unit tests | 🟡 MEDIUM |
| Weeks 21-22 | Launch campaign (Nairaland, Twitter, LinkedIn, WhatsApp groups) | Not started |
| Weeks 23-24 | Analytics, feedback, roadmap | Not started |

---

## ⚠️ Deprecated: Snapshot Feature

**Originally planned for Phase 3, Weeks 13-14. Now cancelled.**

The snapshot feature would have used:
- **Cloudflare Browser Rendering** (Puppeteer) to take screenshots of job URLs
- **Cloudflare R2** bucket to store the screenshots
- A fallback HTML card generator for WhatsApp-sourced jobs (no URL to screenshot)
- A snapshot viewer modal in the dashboard with lazy loading

**Why it was cancelled:**
- High complexity (Browser Rendering setup, Puppeteer error handling, R2 configuration)
- Limited value — most job URLs go dead within days
- The `raw_text` column preserves all original job data forever
- AI-parsed fields (title, company, salary, requirements) contain everything needed at a glance

**If you reconsider:**
The infrastructure notes are preserved in `docs/ARCHITECTURE.md` under the "DEPRECATED: Snapshot Feature" section. The database columns `snapshot_url` and `snapshot_type` already exist in the schema but are always NULL. You would need to:
1. Enable Browser Rendering in Cloudflare dashboard
2. Create an R2 bucket
3. Add browser + R2 bindings to `wrangler.jsonc`
4. Install `@cloudflare/puppeteer`
5. Build the screenshot function and fallback generator
6. Add the snapshot viewer to the dashboard

---

## 🔧 Technical Debt & Infrastructure

These need attention regardless of feature work:

| Issue | Area | Priority |
|---|---|---|
| `wrangler.jsonc` missing env variable bindings | Worker | 🔴 HIGH |
| `PATCH /api/jobs/:id/status` endpoint missing | Worker | 🔴 HIGH |
| `PATCH /api/jobs/:id/notes` endpoint missing | Worker | 🔴 HIGH |
| `status_history` table operations not implemented | Worker | 🟡 MEDIUM |
| `shares` table operations not implemented | Worker | 🟢 LOW |
| DbClient singleton may not reinitialize on env change | Worker | 🟢 LOW |
| Rate limiter is in-memory (per-isolate, not global) | Worker | 🟢 LOW |
| DashboardHome stats are hardcoded to 0 | Dashboard | 🟡 MEDIUM |
| Insights page is a placeholder | Dashboard | 🟢 LOW |
| Settings page is a placeholder | Dashboard | 🟢 LOW |
| Token relay can timeout without user feedback | Extension | 🟡 MEDIUM |
| Token not refreshed automatically | Extension | 🟢 LOW |
| API_BASE_URL hardcoded in extension | Extension | 🟢 LOW |
| No unit tests written (Vitest placeholder only) | Worker | 🟡 MEDIUM |

---

## 📊 Cost Tracking

All services are on free tier. Expected to stay at $0 for the first 1,000 users.

| Service | Free Tier Limit | Expected Usage (Month 1) | Will You Pay? |
|---|---|---|---|
| Cloudflare Workers | 100k requests/day | 5-10k requests | No |
| Groq AI | 30 req/min | 2-5 req/min | No |
| Turso Database | 9GB storage | <100MB for 10k jobs | No |
| Cloudflare R2 | 10GB storage | Not used (snapshot deprecated) | No |
| Clerk Auth | 10,000 users | First 500 users | No |
| Meta WhatsApp API | 1,000 conversations/month | 100-200/month | No |
| Vercel | 100GB bandwidth | <10GB | No |
| Sentry | 5,000 errors/month | <500 errors | No |

**When you'll need to pay:**
- 10,000+ active users → Clerk upgrade ($25/month)
- 100,000+ API requests/day → Cloudflare Workers Paid ($5/month)