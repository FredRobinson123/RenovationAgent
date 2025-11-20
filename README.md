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
     - `VITE_SERVER_URL=http://localhost:5001` – switch this to your deployed API origin in Preview/Production.
     - `VITE_CLERK_PUBLISHABLE_KEY` – the publishable key from Clerk
   - In Clerk → **Allow list**, add:
     - Frontend origin: `http://localhost:5173`
     - Backend origin (for token verification): `http://localhost:5001`

3. **Run the development servers:**
   ```bash
   # Backend / workflows
   pnpm dev

   # Frontend (in a second terminal)
   pnpm --filter client dev
   ```

4. **Sign in & test the chat:**
   - Navigate to `http://localhost:5173`
   - Sign in with a Clerk user (create one in the dashboard if needed)
   - Send a chat message; the frontend forwards the Clerk session token to the backend, which verifies it before running the workflow.

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

1. Deploy the backend (`server/`) first and note the public URL (e.g., `https://renovation-agent-server.vercel.app`).
2. In the Vercel project for the frontend (`client/`), add the following Environment Variables for every environment you deploy:
   - `VITE_SERVER_URL` → `https://your-backend-host`
   - `VITE_CLERK_PUBLISHABLE_KEY` → the same publishable key used locally
3. Redeploy the client so Vite inlines the environment variables. The client now defaults to the current browser origin if `VITE_SERVER_URL` is missing, but explicitly setting it prevents accidental calls to `localhost`.

## Project Structure

- `server/` - Backend server with Mastra agents and workflows
  - `src/mastra/agents/` - Budget and Design agents
  - `src/mastra/tools/` - Custom tools for agents
  - `src/mastra/workflows/` - Workflow orchestration
  - `src/mastra/llms/` - LLM model configuration

## Features

- **Budget Agent**: Helps create detailed renovation budgets with spreadsheets
- **Design Agent**: Assists with interior and exterior design using web search
- **Workflow Orchestration**: Routes conversations to the appropriate agent
- **Clerk Authentication**: Only signed-in users can access the chat; each workflow request includes a Clerk session token that the backend verifies before execution.

## Authentication Flow

1. The React app is wrapped in `ClerkProvider`; unauthenticated visitors see the Clerk `<SignIn />` component.
2. When a user submits a chat message, the frontend requests a fresh Clerk session token and sends it in the `Authorization: Bearer <token>` header to `POST /api/workflows/:id/run`.
3. The backend verifies the token with `@clerk/backend`. Invalid or missing tokens receive `401 Unauthorized`.
4. The verified `userId` (and email, if present) are forwarded to the workflow as part of `inputData`, enabling audit trails or personalized responses.

## Tech Stack

- [Mastra](https://mastra.ai) - AI agent framework
- [AI SDK](https://sdk.vercel.ai) - AI SDK for model interactions
- [Zod](https://zod.dev) - Schema validation
- [Exa](https://exa.ai) - Web search API
- TypeScript

