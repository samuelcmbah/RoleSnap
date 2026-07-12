# RoleSnap Dashboard

The frontend for RoleSnap, built with **React + Vite + TypeScript + Tailwind CSS** and deployed on **Vercel**. Provides the Kanban board interface for tracking job applications, along with authentication, job parsing, and sharing features.

---

## Pages

| Route | Component | Auth Required | Purpose |
|---|---|---|---|
| `/` | `DashboardHome` | Yes | Stats overview (total jobs, interviews, offers) |
| `/jobs` | `MyJobs` | Yes | Job list view (will become Kanban board) |
| `/insights` | `Insights` | Yes | Salary insights (placeholder) |
| `/settings` | `Settings` | Yes | User settings (placeholder) |
| `/login` | Clerk `<SignIn />` | No | Login/register page |
| `/extension-auth` | `ExtensionAuth` | No | Clerk token relay for Chrome Extension |

---

## Component Tree

```
main.tsx
└── ClerkProvider
    └── App (BrowserRouter)
        ├── /login → <SignIn />
        ├── / → AuthGuard → Layout
        │   ├── Sidebar (nav links)
        │   ├── Navbar (Paste Job button + UserButton)
        │   └── <Outlet>
        │       ├── / → DashboardHome
        │       ├── /jobs → MyJobs
        │       ├── /insights → Insights
        │       └── /settings → Settings
        ├── /extension-auth → ExtensionAuth
        └── * → Navigate to /
```

### Key Components

- **`AuthGuard`** — Checks `useAuth().isSignedIn`, redirects to `/login` if not authenticated. Shows loading state while Clerk initializes.
- **`Layout`** — Sidebar + Navbar + Outlet. Contains the "Paste Job" modal that calls `parseJob()` then `saveJob()`.
- **`DashboardHome`** — Welcome message + 3 stat cards (hardcoded to 0 — needs real API data).
- **`MyJobs`** — Fetches jobs from `GET /api/jobs`, displays as a list of cards. Has loading skeletons, error state, and empty state.

---

## API Client (`src/api/jobs.ts`)

All API functions are defined but **some worker endpoints are missing**:

| Function | Backend Status |
|---|---|
| `parseJob(text, sourceUrl, token)` | ✅ `POST /api/parse` — works |
| `saveJob(job, token)` | ✅ `POST /api/jobs` — works |
| `getJobs(token)` | ✅ `GET /api/jobs` — works |
| `updateJobStatus(id, status, token)` | ❌ `PATCH /api/jobs/:id/status` — not in Worker |
| `updateJobNotes(id, notes, token)` | ❌ `PATCH /api/jobs/:id/notes` — not in Worker |

The API client uses `import.meta.env.VITE_API_BASE_URL` as the base URL. It passes the Clerk JWT in the `Authorization: Bearer` header.

---

## Auth Flow

1. **ClerkProvider** wraps the app with the publishable key from `VITE_CLERK_PUBLISHABLE_KEY`
2. **AuthGuard** checks `isLoaded` and `isSignedIn` from `useAuth()`
3. If not signed in → redirect to `/login` (Clerk's `<SignIn />` component)
4. If signed in → render Layout with sidebar
5. API calls call `getToken()` (from `useAuth()`) to get a JWT, passed in headers
6. **ExtensionAuth** page is used by the Chrome Extension's hidden iframe to relay tokens via `postMessage`

---

## Known Issues

### 1. No Kanban Board
`MyJobs` is currently a simple list view. The Kanban board with drag-and-drop has not been built yet. Missing:
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` packages not installed
- No `KanbanBoard`, `KanbanColumn`, or `JobCard` components
- No drag-and-drop between columns (saved → applied → interview → offer → rejected)
- No optimistic updates or rollback on failure

### 2. DashboardHome Uses Hardcoded Stats
The stats on the dashboard page show `0` for total jobs, interviews, and offers. These should be calculated from the API response (or a dedicated stats endpoint).

### 3. Placeholder Pages
- **Insights** — Shows "Coming soon: aggregated salary data" — needs Recharts and salary data endpoint
- **Settings** — Shows "Profile settings and dashboard options will appear here" — not implemented

### 4. No Job Detail Panel
Clicking a job card should slide in a detail panel from the right with:
- Full job details (title, company, location, salary, requirements, contact info)
- Raw text viewer
- Editable notes field (auto-save with debounce)
- Status history timeline
- Share/Forward button
- View-source link

### 5. No Share/Viral Feature
The "Forward to Friend" WhatsApp share button is not built. Once built, it should:
- Open `wa.me` with pre-filled job details
- Call `POST /api/shares` to track the share

### 6. Missing React Query Integration
The `@tanstack/react-query` package is listed in the roadmap but not being used. Currently using raw `useState` + `useEffect` for data fetching. React Query would provide:
- Automatic caching and refetching
- Optimistic updates for drag-and-drop
- Loading/error state management

---

## Next Steps (Kanban Dashboard)

1. **Install dnd-kit packages**: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
2. **Build KanbanBoard component** — 5 columns with horizontal scroll on mobile
3. **Build JobCard component** — draggable card with title, company, location, salary, stack badges, date
4. **Implement drag-and-drop** — `DndContext` + `onDragEnd` handler that calls `updateJobStatus`
5. **Add optimistic updates** — move card immediately, rollback on API failure
6. **Build job detail side panel** — slide-in panel with full details, notes, timeline, share button
7. **Build Forward to Friend button** — WhatsApp share link + share tracking
8. **Add status history timeline** — fetch from `status_history` table, display vertical timeline