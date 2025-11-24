# Deployment Guide

This project no longer uses Docker. Railway’s default build system (Nixpacks) can build each workspace directly from the Git repository, producing simple Node/Vite deployments without container plumbing.

## 1. Environments & prerequisites

- **Package manager** – the repo is a PNPM workspace (`pnpm-workspace.yaml`). All Dockerfiles enable Corepack so no global install is required.
- **Node images** – both builders use `node:20-slim` for compatibility with the Mastra stack. The client runtime switches to `nginx:1.27-alpine`.
- **Ports** – server listens on `PORT` (defaults to `5001`); client serves static assets from Nginx on `PORT` (defaults to `4173`). Railway will inject its own `PORT` values per service.

### Required environment variables

| Service | Key | Purpose |
| --- | --- | --- |
| Server | `PORT` | Provided by Railway; defaults to `5001` for local runs |
|  | `HOST` | Bind host (`0.0.0.0` in containers) |
|  | `CLERK_SECRET_KEY` | Clerk backend key for auth |
|  | `LOG_LEVEL` | Pino log level (`info` default) |
|  | `PRETTY_LOGS` | Set to `true` to enable `pino-pretty` |
|  | `MASTRA_API_URL` | Override Mastra API base (defaults to local server) |
|  | `EXASEARCH_API_KEY` | Optional: required for design search tool |
|  | `GEMINI_API_KEY` | Optional: required for Gemini LLM provider |
| Client | `VITE_SERVER_URL` | Base URL for the server (no trailing slash) |
|  | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
|  | `VITE_ASSISTANT_TIMEOUT_MS` | Optional timeout (ms) for the agent request |

> ⚠️ Secrets (`CLERK_SECRET_KEY`, API keys, Clerk publishable key) should be stored via Railway service variables, not committed locally.

### Frontend structure quick reference

- `client/src/app` – application shell (providers, routes, layout chrome)
- `client/src/features/chat` – all chat-specific pages, hooks, services, and widgets
- `client/src/shared` – generic hooks/utilities reused across features

Keeping the chat domain isolated this way makes it easier to evolve without touching unrelated UI.

## 2. Server deployment (Railway service #1)

1. **Source** – point Railway at the repo root and set the service root to `server`.
2. **Build command** – `pnpm install --frozen-lockfile && pnpm build`
3. **Start command** – `pnpm start` (which runs `node dist/index.js`)
4. **Environment** – set the variables from the table above. Railway supplies `PORT`; keep `HOST=0.0.0.0`.
5. **Local testing** – run `pnpm --filter server... dev` for watch mode or `pnpm --filter server... build && node server/dist/index.js` for a production-like boot (remember to export `GEMINI_API_KEY`, `CLERK_SECRET_KEY`, etc.).

## 3. Client deployment (Railway service #2)

1. **Source** – same repo, service root `client`.
2. **Build command** – `pnpm install --frozen-lockfile && pnpm build`
3. **Start command** – `pnpm preview -- --host 0.0.0.0 --port ${PORT}`
4. **Environment** – set `VITE_SERVER_URL` to the server’s public URL (Railway exposes it as `${{SERVER.RAILWAY_PUBLIC_DOMAIN}}`) and provide the Clerk publishable key + timeout value.
5. **Local testing** – `pnpm --filter client... dev` or `pnpm --filter client... preview -- --host 0.0.0.0 --port 4173`.

## 4. Railway deployment (no Docker)

- Create a Railway project and add two services (server/client) as described above.
- Railway’s auto-detected Node builder (Nixpacks) will install PNPM, honor the provided commands, and keep the deployment simple.
- CLI workflow:
  1. `railway login`
  2. `railway link` (pick the project)
  3. `railway up` (select the service you want to deploy, repeat for the other)
- After each deploy, confirm logs show `pnpm build` followed by the appropriate start command—no containers involved.

### Deployment checks

1. Watch build logs to confirm PNPM installs succeed and the container listens on the assigned port.
2. Once deployed, hit the server’s `/` endpoint (or the `/api/agents/.../run` route) to ensure a 200/401 response, and open the client domain to verify it loads assets via HTTPS.
3. Update the client env var if the server domain changes, then redeploy the client service to bake the new value.

### Rollbacks & scaling

- Each service redeploys independently; you can roll back just the server without touching the client.
- Use Railway’s “Deployments” tab to redeploy a previous image if a release fails.
- Scale worker counts independently from the “Settings → Deployments” panel or via `railway scale`.

## 5. Troubleshooting

- **Builds time out** – ensure `pnpm-lock.yaml` is up to date and each `package.json` has the right scripts (`build`, `start`, `preview`). Railway caches `.pnpm-store`, so subsequent deploys are faster.
- **Missing env vars** – both services fail fast if required keys are absent (e.g., `GEMINI_API_KEY`). Add them via Railway’s “Variables” tab.
- **Client hitting wrong API URL** – double-check `VITE_SERVER_URL` (no trailing slash) and redeploy the client whenever it changes; the value is baked at build time.

