# Renovation Agent

A renovation assistant agent built with Mastra that helps users with design and budget planning for renovation projects.

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env` (if it exists)
   - Add your API keys:
     - `EXA_API_KEY` - Required for web search functionality
     - `GEMINI_API_KEY` - Required for Google Gemini model access

3. **Run the development server:**
   ```bash
   pnpm dev
   ```

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

## Tech Stack

- [Mastra](https://mastra.ai) - AI agent framework
- [AI SDK](https://sdk.vercel.ai) - AI SDK for model interactions
- [Zod](https://zod.dev) - Schema validation
- [Exa](https://exa.ai) - Web search API
- TypeScript

