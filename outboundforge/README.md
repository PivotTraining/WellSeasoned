# OutboundForge

Multi-agent **AI SDR** platform. A campaign takes an Ideal Customer Profile
and a list of leads, then runs each lead through an agent pipeline:

```
research  →  personalize  →  outreach
                 ▲               │
                 └──── supervisor (retry / finish)
```

Built with Next.js 15 (App Router), Supabase, and LangGraph.

> **Status: runnable scaffold.** Every external integration is
> *config-gated* — the app builds and runs with no API keys, and each
> missing integration degrades to a safe no-op instead of throwing or
> fabricating results. No real sends, no invented data.

## Stack

| Layer        | Choice                                             |
| ------------ | -------------------------------------------------- |
| App          | Next.js 15, React 19, Tailwind                     |
| Agents       | LangGraph (`StateGraph`) + `@langchain/openai`     |
| Data / auth  | Supabase (Postgres + RLS)                          |
| Delivery     | Resend                                             |
| Research     | Serper / Apollo (pluggable)                        |

## Layout

```
src/
  app/
    dashboard/                 dashboard shell + pages
      page.tsx                 integration-status overview
      campaigns/new/page.tsx   create + launch a campaign
      campaigns/[id]/page.tsx  campaign detail (trace stub)
    api/campaigns/route.ts     POST → create campaign + run pipeline
  agents/
    campaignGraph.ts           the LangGraph pipeline
    tools/research.ts          lead enrichment (Serper/Apollo/stub)
    scoring.ts                 0-100 lead scoring
    abTest.ts                  variant generation + winner analysis
  lib/
    env.ts                     config flags (the gating layer)
    supabase.ts                browser + service-role clients
    llm.ts                     lazy LLM wrapper
    runtime.ts                 logging + outreach send
    runCampaign.ts             run the graph over a campaign's leads
    types.ts                   shared Zod schemas + types
backend/schema.sql             campaigns / leads / agent_logs + RLS
```

## Getting started

```bash
cd outboundforge
npm install
cp .env.example .env.local   # fill in keys as you enable integrations
npm run dev                  # http://localhost:3000 → /dashboard
```

`npm run build` and `npm run typecheck` both pass with an empty
`.env.local` — the overview page shows every integration as "not
configured" until you add keys.

## Enabling integrations

Add keys to `.env.local` (see `.env.example`). Each flag in
`src/lib/env.ts` flips on independently:

- **Supabase** — run `backend/schema.sql`, then set the URL + anon key
  (and the service-role key for agent writes).
- **LLM** — set `OPENAI_API_KEY` to enable real personalization/scoring.
- **Resend** — set `RESEND_API_KEY` + `OUTREACH_FROM_EMAIL` to send.
- **Research** — set `SERPER_API_KEY` (and/or `APOLLO_API_KEY`).

## Not built in this scaffold

Left as clearly-marked extension points: multi-channel routing
(LinkedIn/voice), the A/B lab UI, a job queue for large lead lists, and
LangGraph checkpoint persistence to Supabase.
