# Deployment Guide

This repo now ships with Docker images for both the API server (`server/`) and Vite client (`client/`). Use this document as the runbook for building those images locally and deploying them as separate Railway services.

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
|  | `WORKFLOW_TIMEOUT_MS` | Timeout guard for workflows (default `60000`) |
|  | `LOG_LEVEL` | Pino log level (`info` default) |
|  | `PRETTY_LOGS` | Set to `true` to enable `pino-pretty` |
|  | `MASTRA_API_URL` | Override Mastra API base (defaults to local server) |
|  | `EXASEARCH_API_KEY` | Optional: required for design search tool |
|  | `GEMINI_API_KEY` | Optional: required for Gemini LLM provider |
| Client | `VITE_SERVER_URL` | Base URL for the server (no trailing slash) |
|  | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
|  | `VITE_WORKFLOW_TIMEOUT_MS` | Mirrors server timeout (default `60000`) |

> ⚠️ Secrets (`CLERK_SECRET_KEY`, API keys, Clerk publishable key) should be stored via Railway service variables, not committed locally.

## 2. Server container (`server/Dockerfile`)

Multi-stage build outline:

1. **Builder** – installs workspace deps with `pnpm install --filter server... --frozen-lockfile`, copies `server/src`, and runs `pnpm --filter server... build` to emit `server/dist`.
2. **Production deps** – re-installs only production dependencies (`--prod`) so the runtime stays slim.
3. **Runtime** – copies `server/dist`, `package.json`, plus both the workspace-level and service-level `node_modules` trees (required because PNPM stores modules at the workspace root). Entry command is `node dist/index.js`.

Key usage notes:

```bash
# Build (context must be repo root so pnpm workspace files are available)
docker build -f server/Dockerfile . -t renovation-agent/server

# Run
docker run --rm -p 5001:5001 \
  -e PORT=5001 \
  -e HOST=0.0.0.0 \
  -e CLERK_SECRET_KEY=sk_live_... \
  renovation-agent/server
```

The container expects Railway to supply `PORT`; locally you can expose whichever port you prefer. Because the local sandbox does not provide Docker, these commands were not executed here—run them in your own environment to validate.

## 3. Client container (`client/Dockerfile`)

Stages:

1. **Builder** – installs workspace deps filtered to `client`, copies the app, and runs `pnpm --filter client... build` to emit `client/dist`.
2. **Runtime** – lightweight `nginx:1.27-alpine` with a template config (`client/nginx.conf.template`). Railway’s entrypoint automatically substitutes `${PORT}` into the template so the container listens on whatever port the platform provides.

Usage:

```bash
docker build -f client/Dockerfile . -t renovation-agent/client

docker run --rm -p 4173:4173 \
  -e PORT=4173 \
  -e VITE_SERVER_URL=http://localhost:5001 \
  -e VITE_CLERK_PUBLISHABLE_KEY=pk_live_... \
  renovation-agent/client
```

Rebuild whenever `VITE_*` values change; they are baked at build time.

## 4. Railway configuration

- `railway.json` (config version `2`) describes two services that build straight from the Dockerfiles in this repo. Railway automatically discovers the Dockerfiles when you run `railway up` or connect the GitHub repository.
- Add both services to the same Railway project so they share private networking.
- Suggested workflow:
  1. `railway login`
  2. `railway link` (select or create the RenovationAgent project)
  3. `railway up` (picks up `railway.json`, builds both containers, and provisions services)
- Inside the Railway dashboard, set service variables:
  - **Server** – fill all keys from the environment table above. Railway supplies `PORT` automatically; keep `HOST=0.0.0.0`.
  - **Client** – set `VITE_SERVER_URL=https://<server-public-domain>` (no trailing slash) and the Clerk publishable key. You can reference another service’s domain using `${{SERVER.RAILWAY_PUBLIC_DOMAIN}}`.

### Deployment checks

1. Watch build logs to confirm PNPM installs succeed and the container listens on the assigned port.
2. Once deployed, hit the server’s `/` endpoint (or whichever workflow routes you expose) to ensure a 200/401 response, and open the client domain to verify it loads assets via HTTPS.
3. Update the client env var if the server domain changes, then redeploy the client service to bake the new value.

### Rollbacks & scaling

- Each service redeploys independently; you can roll back just the server without touching the client.
- Use Railway’s “Deployments” tab to redeploy a previous image if a release fails.
- Scale worker counts independently from the “Settings → Deployments” panel or via `railway scale`.

## 5. Optional local orchestration

If you want local parity with the Railway topology, create a `docker-compose.yml` that references the two images built above, wiring the client’s `VITE_SERVER_URL` to `http://server:5001`. This isn’t required for production but can simplify QA.

## 6. Troubleshooting

- **Docker missing locally** – install Docker Desktop or run builds in CI. The workstation used here does not expose Docker, so no images were built during this change set.
- **PNPM workspace context** – always build from the repo root so the workspace lockfile and configs are available inside the Docker context.
- **CORS errors in prod** – the server sets `Access-Control-Allow-Origin: *`, so as long as the client points to the correct server domain the browser should succeed. Double-check `VITE_SERVER_URL` if requests fail.

