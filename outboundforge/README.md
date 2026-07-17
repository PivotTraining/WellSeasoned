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
    compliance.ts              pre-send spam/CAN-SPAM gate
    replies.ts                 objection + suggestion analysis
    abTest.ts                  variant generation + winner analysis
  lib/
    env.ts                     config flags (the gating layer)
    supabase.ts                browser + service-role clients
    store.ts                   persistence (Supabase or in-memory demo)
    llm.ts                     lazy LLM wrapper
    runtime.ts                 logging + compliance-gated outreach send
    runCampaign.ts             run the graph over a campaign's leads
    types.ts                   shared Zod schemas + lead parsing
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

## What works today (every button powered)

- **Overview** — live stat tiles + integration status + recent campaigns.
- **New campaign** — ICP + pasted leads, a **Live Preview** button that runs
  research → personalize → compliance on a sample lead, and **Launch** which
  runs the full pipeline and redirects to the campaign.
- **Campaign detail** — metrics, the per-step agent trace, an **A/B lab**
  (variant generation via `/api/abtest`) and **Reply insights** (objection
  analysis via `/api/insights`).
- **Compliance gate** — every send is checked for opt-out + spam risk first;
  a failing check blocks the send.

Without keys these run through the stub/in-memory path so the whole flow is
demonstrable offline; with keys they hit the real providers.

## Not built in this scaffold

Clearly-marked extension points: multi-channel routing (LinkedIn/voice), a
job queue for large lead lists, statistical A/B winner selection wired to
live send metrics, and LangGraph checkpoint persistence to Supabase.
