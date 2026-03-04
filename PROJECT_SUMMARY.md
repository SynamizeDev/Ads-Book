# Ads Book — Full Project Summary

> **Previously known as AlertCPL.** Rebranded to Ads Book and migrated to a new repo/deployment.

---

## What is Ads Book?

Ads Book is a **Meta (Facebook) Ads performance monitoring dashboard** for agencies. It:
- Monitors ad accounts via the **Meta Graph API** every 15 minutes (triggered by external cron)
- Alerts via **Telegram** when CPL (Cost Per Lead) exceeds a threshold or ads have zero leads
- **Auto-pauses** underperforming ads via the Meta API
- Provides a **Next.js dashboard** to view account health, alerts, CPL logs, and manage settings

---

## Project Location (Local)

```
d:\Projects\Ads Book\
├── adsbook-backend/      ← Node.js/Express API server
└── adsbook-dashboard/    ← Next.js 16 frontend dashboard
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Meta API | Meta Graph API v21+ |
| Alerts | Telegram Bot API |
| AI Enhancement | Google Gemini API (text enhancement tool) |
| Hosting (Backend) | Render (Free/Starter) |
| Hosting (Frontend) | Vercel (Hobby) |
| Domain | adsbook.xyz (GoDaddy) |
| Repo | github.com/SynamizeDev/Ads-Book |

---

## Live URLs

| Service | URL |
|---|---|
| **Frontend (Vercel)** | https://ads-book.vercel.app |
| **Custom Domain** | https://adsbook.xyz *(DNS propagating)* |
| **Backend (Render)** | https://adsbook-backend.onrender.com |
| **GitHub Repo** | https://github.com/SynamizeDev/Ads-Book |

---

## Backend (`adsbook-backend/`)

### Entry point: `index.js`
One large Express file containing all routes + the alert engine.

### Key API Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check (returns `OK`) |
| GET | `/api/accounts` | List all active ad accounts |
| POST | `/api/accounts` | Create new ad account |
| PATCH | `/api/accounts/:id` | Update account name/threshold |
| DELETE | `/api/accounts/:id` | Soft-delete account |
| GET | `/api/dashboard/summary` | Summary metrics (alerts, paused ads, etc.) |
| GET | `/api/dashboard/account-health` | Per-account health scores |
| GET | `/api/dashboard/urgent-alerts` | Alerts from last 6 hours |
| GET | `/api/cpl-logs` | CPL log history |
| GET | `/api/alerts` | Alert log history |
| GET | `/api/accounts/:id/trends` | 7-day CPL trend data |
| GET | `/api/accounts/:id/campaign-thresholds` | Per-campaign thresholds |
| PUT | `/api/accounts/:id/campaign-thresholds` | Set campaign threshold |
| GET | `/api/accounts/:id/budget` | Meta ad account budget info |
| PATCH | `/api/accounts/:id/auto-pause` | Enable/disable auto-pause |
| GET | `/api/compare` | Cross-account comparison |
| POST | `/api/tools/enhance-text` | AI ad copy enhancer (Gemini) |
| POST | `/run-alert-engine` | Trigger alert engine (requires `x-cron-secret` header) |
| GET | `/test-telegram` | Test Telegram connectivity |

### Alert Engine Logic (`runAlertEngine()`)
- Called every 15 min by external cron hitting `POST /run-alert-engine`
- Fetches active ad accounts from Supabase
- Calls Meta Graph API via `fetchAdInsights()` for each account
- Checks each ad: if CPL > threshold → HIGH_CPL alert; if spend > $15 with 0 leads → ZERO_LEADS alert
- Logs to `alert_logs` table in Supabase
- Auto-pauses ads via Meta API if `auto_pause_enabled = true`
- Sends grouped Telegram alerts per account

### Key Files
```
adsbook-backend/
├── index.js                  ← All routes + alert engine
├── config/supabaseClient.js  ← Supabase client init
├── middleware/auth.js        ← JWT auth (Supabase token verification)
├── services/metaService.js   ← Meta Graph API calls
├── services/autoPauseService.js ← Meta ad pause logic
├── utils/telegram.js         ← Telegram message sender
└── migrations/               ← SQL migration files
```

### Backend Environment Variables (in Render)
```
SUPABASE_URL=https://jfqendxhqltlbvgkwygf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
META_ACCESS_TOKEN=<long-lived Meta user access token>
TELEGRAM_BOT_TOKEN=<bot token>
TELEGRAM_CHAT_ID=<chat id>
CRON_SECRET=<secret used to authenticate /run-alert-engine>
GEMINI_API_KEY=<Gemini API key>
PORT=5000
```

---

## Frontend (`adsbook-dashboard/`)

### Framework: Next.js 16 App Router (TypeScript)

### Key Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Dashboard overview (summary cards, account health table, urgent alerts) |
| `/accounts/[accountId]` | `app/accounts/[accountId]/page.tsx` | Account detail: CPL trends, campaign thresholds, ad logs, budget |
| `/alerts` | `app/alerts/page.tsx` | Full alert log history |
| `/activity` | `app/activity/page.tsx` | Activity log |
| `/compare` | `app/compare/page.tsx` | Cross-account CPL comparison charts |
| `/settings` | `app/settings/page.tsx` | Agency settings (name, Telegram chat ID, default thresholds) |
| `/tools/text-formatter` | `app/tools/text-formatter/page.tsx` | AI ad copy enhancer (calls backend Gemini endpoint) |
| `/login` | `app/login/page.tsx` | Supabase Auth login page |

### Key Components
```
app/components/
├── SidebarNav.tsx          ← Sidebar with account list (collapsible)
├── ThemeProvider.tsx       ← Dark/Light theme (localStorage key: 'adsbook-theme')
├── SplashScreen.tsx        ← Loading splash with "Ads Book" branding
├── AddAccountModal.tsx     ← Form to add new Meta ad account
├── EditAccountModal.tsx    ← Edit account name/threshold
├── DeleteAccountModal.tsx  ← Confirm delete
├── CampaignThresholdEditor.tsx ← Per-campaign CPL threshold
├── TrendCharts.tsx         ← Recharts line charts for CPL trends
├── SystemStatusWidget.tsx  ← Shows last sync time, Meta/Telegram status
└── QuickActions.tsx        ← Run engine, test Telegram buttons
```

### API Layer: `src/lib/api.ts`
- All backend calls go through `fetchApi()` helper
- Adds Supabase JWT token to every request as `Authorization: Bearer <token>`
- `NEXT_PUBLIC_API_URL` points to `https://adsbook-backend.onrender.com`

### Frontend Environment Variables (in Vercel + `.env.local`)
```
NEXT_PUBLIC_API_URL=https://adsbook-backend.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://jfqendxhqltlbvgkwygf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

### Auth Flow
- Supabase Auth (email/password)
- `middleware.ts` protects all routes except `/login` and `/auth/callback`
- `app/layout.tsx` checks auth server-side to render sidebar (authenticated) or plain layout (unauthenticated)
- `lib/supabase-server.ts` — server-side Supabase client
- `lib/supabase-browser.ts` — client-side Supabase client

---

## Database (Supabase)

### Key Tables

| Table | Purpose |
|---|---|
| `agencies` | Agency profile (name, Telegram chat ID, settings) |
| `ad_accounts` | Meta ad accounts being monitored |
| `cpl_logs` | Per-ad CPL data snapshots from each engine run |
| `alert_logs` | HIGH_CPL and ZERO_LEADS alert history |
| `auto_pause_logs` | Record of ads paused by the engine |
| `campaign_thresholds` | Per-campaign CPL overrides |
| `activity_logs` | User action audit trail |

---

## Cron Setup
- External cron service hits `POST https://adsbook-backend.onrender.com/run-alert-engine`
- Must include header: `x-cron-secret: <CRON_SECRET>`
- Runs every **15 minutes**
- Internal cron is disabled in production (`NODE_ENV=production`)

---

## Branding Notes
- All UI text says **"Ads Book"**
- localStorage theme key: `adsbook-theme`
- `package.json` names: `adsbook-backend`, `adsbook-dashboard`
- Render service name: `adsbook-backend`
- Vercel project name: `ads-book`

---

## What Was Deprecated
- `AlertCPL` repo (SynamizeDev/AlertCPL) — deleted
- `alertcpl-backend` Render service — suspended/to be deleted
- Old domain equivalent was `alertcpl-backend.onrender.com`
