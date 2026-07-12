# RoleSnap Chrome Extension

A Chrome Extension (Manifest V3) that lets users save job posts from any website with a right-click. Built with **React + Vite + TypeScript + Tailwind CSS**.

---

## Architecture

### How It Works

1. User selects text on any page
2. Right-click → "Save Job to RoleSnap"
3. Background service worker:
   - Sends text to `POST /api/parse` (no auth needed)
   - Gets parsed job JSON from Groq AI
   - Requests Clerk token from TokenRelay (via `chrome.storage.local`)
   - Sends parsed job + token to `POST /api/jobs`
   - Shows notification: "Job captured and saved!"
4. Side panel opens automatically showing loading → success/error state

### Files

| File | Purpose |
|---|---|
| `src/background.ts` | Service worker: context menu, job capture flow, API calls |
| `src/App.tsx` | TokenRelay component + Popup renderer |
| `src/Popup.tsx` | Popup/side panel UI with 4 states (idle, loading, success, error) |
| `manifest.json` | Extension config (permissions, background worker, side panel) |
| `vite.config.ts` | Build config with static copy for manifest.json |

---

## Token Relay (Clerk Authentication)

Chrome extensions **cannot use Clerk directly** — service workers have no DOM, no cookies, no redirects. The solution uses a hidden iframe bridge:

1. `background.ts` calls `getClerkToken()` which polls `chrome.storage.local`
2. `TokenRelay` (running in the side panel UI) loads a hidden iframe to `<dashboard-url>/extension-auth`
3. The `/extension-auth` page runs Clerk, gets a token via `getToken()`, sends it to the extension via `window.parent.postMessage()`
4. `TokenRelay` receives the message, stores the token in `chrome.storage.local`
5. `getClerkToken()` finds the token and returns it
6. `background.ts` uses the token in the `Authorization` header for `/api/jobs`

---

## UI States (Popup.tsx)

The popup/side panel has 4 states:

### Idle
Shows instructions: "Highlight a job description and right-click to save it to your board."

### Loading
Shows a spinning animation with text "AI is extracting jobs..."

### Success
- Shows count of jobs found
- Lists each job with title and contact info
- Shows a "Synced" badge
- Links to the dashboard

### Error
- Shows failure message
- Suggests highlighting job title and contact info directly
- "Try Again" button resets to idle state

---

## Build & Development

```bash
cd extension
npm install
npm run dev     # Dev server with HMR
npm run build   # Production build → dist/
```

The build output:
- `dist/index.html` — Main popup/side panel page
- `dist/background.js` — Service worker (compiled from `src/background.ts`)
- `dist/manifest.json` — Copied from source via `vite-plugin-static-copy`
- `dist/assets/` — React bundle, CSS, icons

### Loading in Chrome

1. Run `npm run build`
2. Open Chrome → `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked** → select `extension/dist/`
5. Pin the extension to the toolbar

---

## Environment / Configuration

The extension uses two hardcoded URLs:

| Variable | Location | Description |
|---|---|---|
| `API_BASE_URL` | `src/background.ts` (line 1) | Worker API URL for parse/save |
| `DASHBOARD_BASE_URL` | `src/App.tsx` (line 4) | Dashboard URL for iframe token relay |

Update these before building for production.

---

## Permissions (manifest.json)

| Permission | Reason |
|---|---|
| `contextMenus` | Right-click menu to save jobs |
| `sidePanel` | Opens side panel on right-click |
| `activeTab` | Access current tab URL for source tracking |
| `storage` | Store Clerk token and last action state |
| `scripting` | Execute scripts in tabs (future use) |
| `notifications` | Show "Job saved!" notification |

---

## Known Issues

### 1. Token Relay Can Timeout
The `getClerkToken()` function polls for up to 8 seconds. If the user is not signed in to the dashboard, the iframe will show a sign-in form and the token will never arrive. The extension will throw: "Not authenticated with Clerk. Open the dashboard and sign in to connect the extension."

**Current behavior:** The error is thrown and caught, setting the popup to error state with the error message. The user needs to open the dashboard, sign in, then try again.

**Potential improvement:** Instead of polling silently, the extension could detect the "not signed in" state from the iframe's postMessage and proactively redirect the user to sign in.

### 2. Token Not Refreshed Automatically
Clerk tokens expire after some time. The extension stores the token in `chrome.storage.local` but does not refresh it automatically. If a token expires, the user would need to reopen the extension side panel to trigger a fresh token relay.

### 3. No Visual Sign-In Prompt
When the token relay fails, the error message says "Not authenticated with Clerk" but doesn't provide a clickable link to the dashboard login page. The user has to manually open the dashboard.

### 4. API_BASE_URL is Hardcoded
The worker URL is hardcoded in `background.ts`. If the worker is redeployed to a different URL, the extension needs to be rebuilt and republished. Consider making this configurable.

---

## Next Steps

1. Add a "Sign In" link in the error state that opens the dashboard login page
2. Implement token refresh — re-request token from iframe before expiry
3. Add clickable dashboard URL in error messages
4. Move API_BASE_URL to manifest.json or a config file for easier updates
5. Add keyboard shortcut (e.g., Ctrl+Shift+S) to save selected text