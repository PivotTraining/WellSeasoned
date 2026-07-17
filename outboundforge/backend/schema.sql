-- OutboundForge schema. Run in the Supabase SQL editor.
-- Tables: campaigns, leads, agent_logs. RLS scopes rows to the owning user;
-- the service-role key (used by agent runs) bypasses RLS server-side.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
create table if not exists campaigns (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade,
  name       text not null,
  icp        jsonb not null default '{}'::jsonb,
  status     text not null default 'draft'
             check (status in ('draft', 'running', 'paused', 'done')),
  metrics    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns on delete cascade,
  data        jsonb not null,
  status      text not null default 'queued'
              check (status in ('queued','researching','personalizing',
                                'sent','skipped','error')),
  agent_trace jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists agent_logs (
  id          bigserial primary key,
  campaign_id uuid references campaigns on delete cascade,
  step        text not null,
  input       jsonb,
  output      jsonb,
  timestamp   timestamptz not null default now()
);

create index if not exists leads_campaign_idx on leads (campaign_id);
create index if not exists agent_logs_campaign_idx on agent_logs (campaign_id);

-- ---------------------------------------------------------------------------
-- RLS: a user sees only their own campaigns (and the leads/logs beneath them).
alter table campaigns  enable row level security;
alter table leads      enable row level security;
alter table agent_logs enable row level security;

create policy campaigns_owner on campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy leads_owner on leads
  for all using (
    exists (select 1 from campaigns c
            where c.id = leads.campaign_id and c.user_id = auth.uid())
  );

create policy agent_logs_owner on agent_logs
  for select using (
    exists (select 1 from campaigns c
            where c.id = agent_logs.campaign_id and c.user_id = auth.uid())
  );
