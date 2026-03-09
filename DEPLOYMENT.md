# Deployment Guide

This project deploys as a single Vercel project. The Vite client is served as static files from the CDN and the server logic runs as Vercel Serverless Functions. A Vercel Cron Job handles the daily upload cleanup.

**Requires Vercel Pro plan** (agent requests need `maxDuration` > 10 s, and cron jobs require Pro).

## 1. Prerequisites

- **Package manager** – PNPM workspace (`pnpm-workspace.yaml`).
- **Node version** – 20+ (set in Vercel project settings under *General → Node.js Version*).
- **Vercel CLI** – `npm i -g vercel` for local preview deploys.

### Required environment variables

Set these in **Vercel → Project Settings → Environment Variables**.

| Variable | Purpose |
| --- | --- |
| `CLERK_SECRET_KEY` | Clerk backend auth key |
| `GEMINI_API_KEY` | Google Gemini LLM provider |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
| `CRON_SECRET` | Vercel cron job auth (auto-generated on Pro) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key (needs `VITE_` prefix) |

Optional variables: `EXASEARCH_API_KEY`, `AI_GATEWAY_API_KEY`, `LOG_LEVEL`, `SUPABASE_BUCKET`, `UPLOAD_MAX_FILE_SIZE_MB`, `UPLOAD_MAX_FILE_COUNT`, `UPLOAD_SIGNED_URL_TTL_SECONDS`, `UPLOAD_RETENTION_HOURS`, `VITE_ASSISTANT_TIMEOUT_MS`.

> Secrets should only be stored in Vercel environment variables, never committed to the repo.

### Frontend structure quick reference

- `client/src/app` – application shell (providers, routes, layout chrome)
- `client/src/features/chat` – chat-specific pages, hooks, services, and widgets
- `client/src/shared` – generic hooks/utilities reused across features

## 2. How it works on Vercel

| Concern | How it is handled |
| --- | --- |
| **Static frontend** | `client/` is built by Vite; output in `client/dist/` is served by Vercel's CDN |
| **API routes** | Files in `api/` become Vercel Serverless Functions (Node.js runtime) |
| **Shared server code** | `server/src/` is compiled to `server/dist/` by `tsc`; API functions import from `server/dist/` |
| **Upload cleanup** | Vercel Cron Job hits `GET /api/cron/upload-cleanup` daily at 18:00 UTC |
| **Same-origin API** | Client and API share the same domain — no CORS issues, no `VITE_SERVER_URL` needed |

### API route mapping

| Route | Method | Serverless function |
| --- | --- | --- |
| `/api/health` | GET | `api/health.ts` |
| `/api/status` | GET | `api/status.ts` |
| `/api/agents/:slug/run` | POST | `api/agents/[agentSlug]/run.ts` |
| `/api/uploads/images` | POST | `api/uploads/images.ts` |
| `/api/uploads/:id` | DELETE | `api/uploads/[uploadId].ts` |
| `/api/plan/:sessionId/assets` | GET | `api/plan/[sessionId]/assets.ts` |
| `/api/cron/upload-cleanup` | GET | `api/cron/upload-cleanup.ts` |

## 3. Deploying

### First-time setup

1. Install the Vercel CLI: `npm i -g vercel`
2. Run `vercel link` in the repo root and select (or create) the project.
3. Add all required environment variables in the Vercel dashboard.
4. Push to the linked Git branch, or run `vercel --prod` from the CLI.

### Subsequent deploys

Push to the production branch. Vercel builds automatically:

1. `pnpm install --frozen-lockfile`
2. `pnpm run build:vercel` (compiles server TypeScript, then builds the Vite client)
3. Vercel bundles each `api/*.ts` file into an individual serverless function.
4. Static files from `client/dist/` are deployed to the CDN.

### Preview deploys

Every pull request gets a unique preview URL. Use it to test changes before merging.

## 4. Local development

Local dev uses the standalone Node.js server (not serverless functions):

```bash
# Terminal 1 – API server (port 5001)
pnpm api

# Terminal 2 – Vite dev server (port 5173)
pnpm --filter client dev
```

The client's `VITE_SERVER_URL` defaults to `http://localhost:5001` for local development.

To preview the Vercel build locally:

```bash
vercel dev
```

## 5. Troubleshooting

- **Build fails** – Ensure `pnpm-lock.yaml` is up to date. Run `pnpm run build:vercel` locally to reproduce.
- **Missing env vars** – Both server modules and API functions fail fast if required keys (e.g. `GEMINI_API_KEY`, `CLERK_SECRET_KEY`) are missing. Add them in the Vercel dashboard.
- **Agent request times out** – The `maxDuration` is set to 300 s (5 min). If requests exceed this, check server logs in the Vercel dashboard for agent errors.
- **Upload too large** – Vercel Serverless Functions have a ~4.5 MB streaming body limit. For larger files, consider switching to direct-to-Supabase uploads from the client.
- **Cron not running** – Verify the cron schedule in `vercel.json` and check that `CRON_SECRET` is set. Vercel auto-generates this on Pro plans. Cron logs appear under **Vercel → Project → Logs**.
- **Cold starts** – First invocation after idle bundles the full Mastra stack. Subsequent calls reuse the warm instance. Vercel Pro keeps functions warm longer.
