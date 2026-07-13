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
| Week 3 | Chrome Extension context menu working across 7 tested sites | ✅ |
| Week 4 | Extension sends text to API, saves job, shows success popup | ✅ |
| Week 5 | Message-Forward Bot webhook receiving messages and saving jobs to Turso | ✅ |
| Week 6 | Message-Forward Bot replies with job link, tested by 3 real users | ✅ |

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

### Phase 2 — Dashboard & Search (Weeks 9-13)

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
| **Week 13** | **Search — filter by text, stack, location, status** | 🟡 MEDIUM | Worker search endpoint |

### Phase 3 — Salary Insights & Retention (Weeks 14-17)

| Week | Milestone | Priority | Dependencies |
|---|---|---|---|
| Week 14 | Salary Insights page with charts | 🟢 LOW | /api/insights/salaries |
| **Week 15** | **Set follow-up reminder (date picker in detail panel)** | 🟡 MEDIUM | PATCH reminder endpoint |
| **Week 15** | **Resend integration + email helper** | 🟡 MEDIUM | RESEND_API_KEY |
| **Week 16** | **Cloudflare Cron Trigger for daily reminders** | 🟡 MEDIUM | Reminder endpoints |
| Week 16 | WhatsApp + email reminders both firing correctly | 🟡 MEDIUM | Cron trigger |
| Week 16 | Weekly digest email (opt-in) | 🟢 LOW | Cron trigger |
| Week 16 | Notification preferences opt-in flow | 🟡 MEDIUM | notification_prefs table |
| Week 17 | Buffer / QA week for Phase 3 features | 🟢 LOW | Everything above |

### Phase 4 — Launch & Scale (Weeks 18-21)

| Week | Milestone | Priority | Dependencies |
|---|---|---|---|
| Week 18 | Demo mode with pre-loaded sample jobs | 🟢 LOW | None |
| Week 18 | Lighthouse >90 optimization | 🟢 LOW | None |
| Week 18 | Landing page with repositioned copy | 🟡 MEDIUM | None |
| Week 18 | Unit tests (Vitest) | 🟡 MEDIUM | None |
| Week 19 | Launch campaign across communities | 🔴 HIGH | Landing page |
| Week 20 | Product Hunt launch + first real signups | 🔴 HIGH | Launch campaign |
| Week 21 | Analytics active, user interviews done, v4.1 roadmap published | 🟡 MEDIUM | Users |

---

## Future Roadmap — Deferred, Not Deleted

These features didn't make the MVP cut. Revisit them once real users explicitly ask.

### Public Community Job Board
A page where non-users can browse recent anonymized jobs. Deferred because it competes directly with LinkedIn, Jobberman, Indeed, and Wellfound — not where RoleSnap's moat is. Reconsider if user interviews surface demand for browsing others' saved jobs.

### AI Natural-Language Search
Letting users type queries like "remote React roles under ₦800k" and having AI convert that to structured filters. Deferred because filter-based search (Week 13) covers the MVP. Add it later if users with 200+ jobs find filters tedious.

### Saved-Search Email Alerts
Letting users save a search and get emailed when new matching jobs appear. Natural extension once search (Week 13) and email reminders (Weeks 15-16) are both stable. Build after both foundations are solid.

### Screenshot / Snapshot Preservation
Originally planned as Cloudflare Browser Rendering (Puppeteer) + R2 storage. Removed entirely — not just deferred — because:
- High complexity (Browser Rendering setup, Puppeteer error handling, R2 configuration)
- Limited value — most job URLs go dead within days
- The `raw_text` column preserves all original job data forever
- AI-parsed fields contain everything a user needs at a glance

---

## 🔧 Technical Debt & Infrastructure

These need attention regardless of feature work:

| Issue | Area | Priority |
|---|---|---|
| `wrangler.jsonc` missing env variable bindings | Worker | 🔴 HIGH |
| `PATCH /api/jobs/:id/status` endpoint missing | Worker | 🔴 HIGH |
| `PATCH /api/jobs/:id/notes` endpoint missing | Worker | 🔴 HIGH |
| `PATCH /api/jobs/:id/reminder` endpoint missing | Worker | 🟡 MEDIUM |
| `GET /api/jobs/search` endpoint missing | Worker | 🟡 MEDIUM |
| `POST /api/notifications/prefs` endpoint missing | Worker | 🟡 MEDIUM |
| `POST /api/notifications/test` endpoint missing | Worker | 🟢 LOW |
| `GET /api/insights/salaries` endpoint missing | Worker | 🟢 LOW |
| `status_history` table operations not implemented | Worker | 🟡 MEDIUM |
| `shares` table operations not implemented | Worker | 🟢 LOW |
| `notification_prefs` table may not exist in Turso | Worker | 🟡 MEDIUM |
| DbClient singleton may not reinitialize on env change | Worker | 🟢 LOW |
| Rate limiter is in-memory (per-isolate, not global) | Worker | 🟢 LOW |
| DashboardHome stats are hardcoded to 0 | Dashboard | 🟡 MEDIUM |
| No search page or search UI | Dashboard | 🟡 MEDIUM |
| No notification preferences UI | Dashboard | 🟡 MEDIUM |
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
| Groq AI | 30 req/min | 3-6 req/min (parsing + search) | No |
| Turso Database | 9GB storage | <100MB for 10k jobs | No |
| Clerk Auth | 10,000 users | First 500 users | No |
| Meta WhatsApp API | 1,000 conversations/month | 100-200/month | No |
| Resend (Email) | 3,000 emails/month | 200-400/month | No |
| Vercel | 100GB bandwidth | <10GB | No |
| Sentry | 5,000 errors/month | <500 errors | No |

**When you'll need to pay:**
- 10,000+ active users → Clerk upgrade ($25/month)
- 100,000+ API requests/day → Cloudflare Workers Paid ($5/month)
- 3,000+ emails/month → Resend upgrade ($20/month)