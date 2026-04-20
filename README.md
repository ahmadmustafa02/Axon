# Axon - Signal before the noise

Axon is a personal AI briefing agent. You pick topics, Axon pulls relevant stories, scores them with Gemini Flash, assembles a daily briefing, and can email the result.

Built with React, TypeScript, Vite, Supabase, and Google Gemini Flash.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Supabase Postgres + Auth + Edge Functions
- AI: Google Gemini Flash via OpenAI-compatible chat endpoint
- Data sources: Hacker News (Algolia) and Dev.to

## Project Structure

- `src/` - React frontend
- `supabase/migrations/` - database schema and policy migrations
- `supabase/functions/` - Supabase Edge Functions for scraping, scoring, assembling, and email delivery
- `supabase/config.toml` - local Supabase function config

## Prerequisites

- Node.js 18+ (or newer LTS)
- npm
- Supabase CLI

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in project root for frontend values:

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

3. Run frontend:

```bash
npm run dev
```

4. Build/test/lint:

```bash
npm run build
npm run test
npm run lint
```

## Supabase Setup

Apply schema:

- Option A: run migrations in `supabase/migrations/` in order
- Option B: paste your combined SQL into Supabase SQL Editor

Deploy edge functions:

```bash
supabase functions deploy scrape-sources
supabase functions deploy filter-articles
supabase functions deploy assemble-briefing
supabase functions deploy send-briefing-email
supabase functions deploy run-daily-pipeline
```

Set secrets (Supabase project secrets):

```bash
supabase secrets set SUPABASE_URL="https://<your-project-ref>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set SUPABASE_PUBLISHABLE_KEY="<publishable-key>"

supabase secrets set AI_GATEWAY_API_KEY="<gemini-api-key>"
supabase secrets set AI_GATEWAY_URL="https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

supabase secrets set RESEND_GATEWAY_URL="<your-resend-gateway-base-url>"
supabase secrets set GATEWAY_API_KEY="<gateway-auth-key>"
supabase secrets set RESEND_API_KEY="<resend-api-key>"
```

Notes:

- `AI_GATEWAY_URL` is optional in code and defaults to the Google OpenAI-compatible Gemini endpoint.
- `AI_GATEWAY_API_KEY` is required for AI scoring/briefing generation functions.
- In `supabase/config.toml`, `run-daily-pipeline` and `send-briefing-email` are configured with `verify_jwt = false` for cron/service usage.

## Environment Variables

### Frontend (`.env`)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Edge Functions (Supabase Secrets)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`)
- `AI_GATEWAY_API_KEY`
- `AI_GATEWAY_URL` (optional, has fallback)
- `RESEND_GATEWAY_URL` (email function)
- `GATEWAY_API_KEY` (email gateway auth)
- `RESEND_API_KEY` (email provider key)

## Edge Functions Overview

### `scrape-sources`

- Authenticated user endpoint
- Reads user's topics
- Fetches stories from Hacker News and Dev.to
- Hashes URLs and upserts deduplicated rows into `articles`

### `filter-articles`

- Authenticated user endpoint
- Loads unrated articles
- Calls Gemini Flash with tool calling to return relevance/velocity/summary
- Updates article scoring fields in `articles`

### `assemble-briefing`

- Authenticated user endpoint
- Loads high-signal scored articles
- Calls Gemini Flash with tool calling to produce structured briefing JSON
- Writes daily row into `briefings`

### `send-briefing-email`

- Supports service-role mode (`user_id`) and user JWT mode
- Renders HTML email from briefing content + article links
- Sends email via configured resend gateway
- Marks `briefings.delivered_at` after successful send

### `run-daily-pipeline`

- Orchestrates scrape -> filter -> assemble -> optional email
- Manual mode: run for one user
- Cron mode: runs for users whose local delivery time is due
- Intended to be scheduled via `pg_cron`

## Typical Pipeline Flow

1. User sets topics
2. `scrape-sources` collects new content
3. `filter-articles` scores signal quality
4. `assemble-briefing` creates a concise daily briefing
5. `send-briefing-email` delivers the briefing
6. `run-daily-pipeline` automates the full sequence

## Development Notes

- Keep migrations append-only and ordered by timestamp.
- Edge functions use service role for writes where needed.
- AI responses are validated by structured tool-call schemas before persistence.
