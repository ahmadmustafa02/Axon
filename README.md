<div align="center">

# ⚡ Axon
### Signal before the noise

[![Live on Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)](https://ai-axon.vercel.app)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Edge%20Functions-3FCF8E?logo=supabase&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-llama--3.3--70b-F55036)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

[🌐 Live App](https://ai-axon.vercel.app) • [💻 GitHub](https://github.com/ahmadmustafa02/Axon)

</div>

Axon is a personal AI daily briefing agent that turns noisy feeds into focused morning intelligence.  
Pick your topics, let Axon ingest fresh stories, rank what matters with Groq AI, and deliver a clean briefing in a fast, beautiful dark UI.

![Dashboard](./public/screenshot.png)

## ✨ Features

- 🧠 **Personalized signal engine** — track topics like AI agents, robotics, climate tech, security, and more
- 🕵️ **Daily source scraping** — pulls fresh stories from Hacker News + Dev.to
- 📊 **AI relevance scoring** — Groq (`llama-3.3-70b`) scores articles `0-100` and tags momentum (`rising`, `steady`, `noise`)
- 🗞️ **Daily briefing assembly** — top stories + rising trends in a concise, readable format
- 📬 **Optional email delivery** — send daily briefings via Resend integration
- 🌙 **Polished dark UI** — fast React experience with keyboard shortcuts
- 🆓 **Free-friendly architecture** — self-hostable, with free AI inference path via Groq

## 🧱 Tech Stack

| Layer | Tech | Purpose |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast, typed SPA with modern DX |
| Backend | Supabase (Postgres, Auth, Edge Functions) | Data, auth, serverless jobs |
| AI | Groq (`llama-3.3-70b`) | Relevance scoring + briefing generation |
| Email | Resend | Optional daily briefing delivery |
| Sources | Hacker News, Dev.to | Daily article ingestion |

## 🚀 Quick Start

### 1) Clone and install

```bash
git clone https://github.com/ahmadmustafa02/Axon.git
cd Axon
npm install
```

### 2) Configure frontend env (`.env`)

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

### 3) Set up Supabase

Run migrations from `supabase/migrations` (oldest to newest), then deploy functions:

```bash
supabase functions deploy scrape-sources
supabase functions deploy filter-articles
supabase functions deploy assemble-briefing
supabase functions deploy send-briefing-email
supabase functions deploy run-daily-pipeline
```

Set function secrets:

```bash
supabase secrets set SUPABASE_URL="https://<your-project-ref>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set SUPABASE_PUBLISHABLE_KEY="<publishable-or-anon-key>"

supabase secrets set AI_GATEWAY_URL="https://api.groq.com/openai/v1/chat/completions"
supabase secrets set AI_GATEWAY_API_KEY="<groq-api-key>"
supabase secrets set AI_GATEWAY_MODEL="llama-3.3-70b-versatile"

supabase secrets set RESEND_GATEWAY_URL="<resend-connector-base-url>"
supabase secrets set GATEWAY_API_KEY="<connector-key>"
supabase secrets set RESEND_API_KEY="<resend-api-key>"
```

### 4) Start app

```bash
npm run dev
```

## 🔐 Environment Variables

| Variable | Where | Required | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend `.env` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend `.env` | Yes | Supabase publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Frontend `.env` | Yes | Supabase project ref |
| `SUPABASE_URL` | Edge Function secret | Yes | Supabase URL for server-side operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function secret | Yes | Service role key for privileged writes |
| `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY` | Edge Function secret | Yes | JWT user verification client key |
| `AI_GATEWAY_URL` | Edge Function secret | Yes | OpenAI-compatible chat endpoint (Groq) |
| `AI_GATEWAY_API_KEY` | Edge Function secret | Yes | Groq API key |
| `AI_GATEWAY_MODEL` | Edge Function secret | Yes | Example: `llama-3.3-70b-versatile` |
| `RESEND_GATEWAY_URL` | Edge Function secret | Optional | Connector base URL for email |
| `GATEWAY_API_KEY` | Edge Function secret | Optional | Connector auth key |
| `RESEND_API_KEY` | Edge Function secret | Optional | Resend provider key |

## ⚙️ Edge Functions Overview

| Function | What it does |
|---|---|
| `scrape-sources` | Fetches user-topic articles from Hacker News + Dev.to and dedupes into `articles` |
| `filter-articles` | Scores unrated articles with Groq (`relevance`, `velocity`, `summary`) |
| `assemble-briefing` | Builds daily structured briefing JSON from highest-signal scored stories |
| `send-briefing-email` | Renders briefing email HTML and sends it through Resend connector |
| `run-daily-pipeline` | Orchestrates scrape → filter → assemble → optional email for due users |

## 🏠 Self-Hosting (Brief)

1. Create a Supabase project
2. Apply SQL migrations from `supabase/migrations`
3. Deploy edge functions and set secrets
4. Set frontend `.env` and deploy (Vercel/Netlify/Docker)
5. (Optional) Configure cron for automated daily pipeline runs

Axon is free to self-host, and Groq provides a free usage tier to get started quickly.

## 🛣️ Roadmap

- [x] Topic-driven personalized onboarding
- [x] Daily scraping from Hacker News and Dev.to
- [x] AI relevance + velocity scoring
- [x] Daily briefing generation and archive
- [x] Optional email delivery toggle
- [ ] Source expansion (Reddit, arXiv, product blogs)
- [ ] Digest quality feedback loop (thumbs up/down learning)
- [ ] Team/shared briefings
- [ ] Multi-language briefings

## 🤝 Contributing

Contributions are welcome and appreciated.

1. Fork the repo
2. Create a feature branch (`feat/awesome-idea`)
3. Commit your changes
4. Open a PR with context + screenshots if UI changes are involved

If you’re fixing bugs, include reproduction steps and expected behavior.

## 📄 License

MIT — see `LICENSE` for details.
