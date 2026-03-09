# Renovation Agent

A renovation assistant agent built with Mastra that helps users with design and budget planning for renovation projects.

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   - Backend: copy `server/env.example` → `server/.env` and populate:
     - `PORT` / `HOST` (optional overrides)
     - `CLERK_SECRET_KEY` – from the Clerk dashboard (API Keys tab)
     - Any agent-specific keys (`EXA_API_KEY`, `GEMINI_API_KEY`, etc.) you already use
  - Frontend: copy `client/env.example` → `client/.env` and populate:
    - `VITE_SERVER_URL=http://localhost:5001` – local API origin for development. Leave this unset in the Vercel production deploy unless you intentionally host the API on a different origin.
     - `VITE_CLERK_PUBLISHABLE_KEY` – the publishable key from Clerk
   - In Clerk → **Allow list**, add:
     - Frontend origin: `http://localhost:5173`
     - Backend origin (for token verification): `http://localhost:5001`

3. **Run the development servers:**
   ```bash
   # Backend / agent API
   pnpm dev

   # Frontend (in a second terminal)
   pnpm --filter client dev
   ```

4. **Sign in & test the chat:**
   - Navigate to `http://localhost:5173`
   - Sign in with a Clerk user (create one in the dashboard if needed)
   - Send a chat message; the frontend forwards the Clerk session token to the backend, which now routes everything through the lead renovation agent.

## Image uploads & cleanup

- The chat now supports customer inspiration uploads. Configure Supabase once:
  - Create a bucket (defaults to `chat-image-uploads`).
  - Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_BUCKET` in `server/.env`.
  - Tune upload limits with `UPLOAD_MAX_FILE_SIZE_MB`, `UPLOAD_MAX_FILE_COUNT`, and `UPLOAD_SIGNED_URL_TTL_SECONDS`.
- Provision the metadata table: run the SQL in `server/supabase/schema.sql` via the Supabase SQL editor or `psql "$SUPABASE_DB_URL" -f server/supabase/schema.sql`. This creates the `chat_image_uploads` table and the default storage bucket.
- If the upload service is misconfigured (missing bucket, table, or credentials) the API will now respond with a descriptive error such as _“Uploads backend is not configured”_ or _“Uploads bucket "chat-image-uploads" does not exist yet”_ to speed up debugging.
- Uploaded files are ephemeral. A cron job runs daily at **18:00 Europe/London** (`UPLOAD_CLEANUP_CRON`) and deletes any uploads older than `UPLOAD_RETENTION_HOURS` (24 by default) from both Supabase storage and the metadata table.
- Need to reclaim space immediately? Run the cleaner manually:
  ```bash
  pnpm --filter server cleanup-uploads
  ```
  This uses the same retention window and prints how many uploads were removed.

## Deploying to Vercel

This repo is designed to deploy as a single Vercel project: the Vite client is served from the same origin as the `api/` serverless routes.

1. Create or link one Vercel project at the repo root.
2. Add the required environment variables in Vercel:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - Server-side secrets such as `CLERK_SECRET_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`
3. Do not set `VITE_SERVER_URL` for the normal production deployment. The client now prefers the current browser origin in deployed environments, which avoids stale cross-origin API URLs.
4. Redeploy after changing environment variables.

Set `VITE_SERVER_URL` only if you intentionally split the frontend and backend across different origins.

## Project Structure

- `server/` - Backend server with Mastra lead + specialist agents
  - `src/mastra/agents/` - Lead agent and specialist definitions
  - `src/mastra/tools/` - Custom tools for agents (including sub-agent wrappers)
  - `src/mastra/llms/` - LLM model configuration

## Features

- **Budget Agent**: Helps create detailed renovation budgets with spreadsheets
- **Design Agent**: Assists with interior and exterior design using web search
- **Lead Agent Orchestration**: A single lead assistant coordinates the specialist agents through tool calls
- **Clerk Authentication**: Only signed-in users can access the chat; each agent request includes a Clerk session token that the backend verifies before execution.

## Authentication Flow

1. The React app is wrapped in `ClerkProvider`; unauthenticated visitors see the Clerk `<SignIn />` component.
2. When a user submits a chat message, the frontend requests a fresh Clerk session token and sends it in the `Authorization: Bearer <token>` header to `POST /api/agents/lead-renovation-agent/run`.
3. The backend verifies the token with `@clerk/backend`. Invalid or missing tokens receive `401 Unauthorized`.
4. The verified `userId` (and email, if present) are forwarded to the agent payload so downstream tooling can associate uploads and personalization.

## Tech Stack

- [Mastra](https://mastra.ai) - AI agent framework
- [AI SDK](https://sdk.vercel.ai) - AI SDK for model interactions
- [Zod](https://zod.dev) - Schema validation
- [Exa](https://exa.ai) - Web search API
- TypeScript
