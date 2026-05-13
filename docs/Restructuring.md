# Restructuring App after feedback
i have decided to make this app solely for generating sales for b2b. 

-Go through all the points below and tell me what do you think about them. if they feel ok then we will brainstorm the changes.
- lets not generate any code for now.

- Suggest some key sales perspective we need to cover to make this app valuable to users

## general
- Manage app state better maybe with react/tanstack-query
- make every component and elemente responsive, cards dont work well in mobile

## Signal
- Right now this sits inside leads route but I think we need to move it to it own route /signals
- Initial AI analysis should happen in signals/[id] page because users need more data before they can add a signal as lead or ignore it. So the dossier we have generated in leads/[id] should happen in this page. We need to provide more details for user to decide on a signal to be converted into lead
- We also want to call "signals" as "inbox" which seems way more intuitive than signal

- we already are fetching new feeds from different source using our hono app
- we need to also add in ways to include relevant events, ,eetups. industry events which might be good place to sell
- we can also make this a separate feature if you think it needs to be one

## Dedicated profile page for users where they can manage fields for their business profile which we use as context to 
- this would be at /profiles/[userid]
- users will be able to manage things in the profile tables 
- as well feed sources
- we will also need to make provisions for integrations for email, storage, automation tools, calendar, please also suggests other integration that might be useful



## Leads
We have to improve leads pages and below are few enhancements.

1. we have to improve state management and fetching of leads, i have to refresh page to see changes no at times
2. lead will just use the research saved in table from signals table which we want to generate and save in raw_signals
3. leads table will now have leads ealier we were showing both signals and leads (pipeline)
4. /leads/[id]- we want to use this puraly for managing lead, finding right contact, putting together proposal, matching/bundling right product and services and lead stage management and integrating email, whatsapp, automation etc


# Breakdown of Features and Routes
After our previous discussion, I wanted to App will have Four main components

## 1. Signals -> this is the raw signal that we are getting from the hono worker. Following are details for the types and sources of the signals

- Generic signals: The standard signals from market for acquisitions, trends, luanches, funding, regulations etc which might be interesting to most.
- user based signals : specific signals that users adds to their feed google alerts rss feeds, apis etc. we will have to limit custom signals users can create, this as it result in more work for our watcher
- signals for events based on locations
- user can also add anythings that seems like prospective lead to signals


### Flow (Signals)

1. HONO watcher:  gathers news from feeds and saves it to database (supabase, raw_feeds table) after deepseek evaluates the story and extract keey info, adds rational and assigns hotness_score
2. Inbox: rows from raw_feed which match users geography + filters + hotness lands on inbox. route: "/signals", users can also add their own signal here with details, story url, company details etc (based on raw_feed schema)
3. Signal Research : Before users can decide on whether to add items from inbox (signal) as a lead they need more research, we will generate research (company, why this works for user's company and offering, case studies etc). A complete dossier on the potential of this signal as a lead. Route: "/signals/[id]"
4. Add signal/inbox entry as lead

### table schema

```sql
create table public.raw_signals (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  feed_id uuid null,
  title text null,
  link text null,
  description text null,
  priority text null,
  status text null default 'pending'::text,
  published_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  matched_keywords text[] null,
  metadata jsonb null default '{}'::jsonb,
  hotness_score integer null,
  llm_reasoning text null,
  lead_category text null,
  is_qualified boolean null default true,
  company_name text null,
  country text null default 'India'::text,
  constraint raw_signals_pkey primary key (id),
  constraint raw_signals_user_id_link_key unique (user_id, link),
  constraint unique_user_signal unique (user_id, link),
  constraint raw_signals_feed_id_fkey foreign KEY (feed_id) references feed_sources (id) on delete CASCADE,
  constraint fk_user foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint raw_signals_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint raw_signals_hotness_score_check check (
    (
      (hotness_score >= 0)
      and (hotness_score <= 10)
    )
  )
) TABLESPACE pg_default;

create table public.feed_sources (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  url text not null,
  label text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  type text null default 'rss'::text,
  api_config jsonb null default '{}'::jsonb,
  constraint feed_sources_pkey primary key (id),
  constraint feed_sources_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

```



## 2. Leads
these are signals which have been qualified and added

### Lead Management features
- Company research
- opportunity research
- Putting together right offer ( company needs and user profile for company and product offering)
- people research
- sales enablement
- lead/conversion tracking ( can be manual in the beginning but after right integration we can make it automated)
- communications management

### Flow

### table Schema
```sql
create table public.leads (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  signal_id uuid null,
  company_name text null,
  title text null,
  hotness_score integer null,
  lead_category text null,
  llm_reasoning text null,
  linkedin_url text null,
  decision_maker_name text null,
  decision_maker_contact jsonb null,
  sales_points text[] null,
  status text null default 'new'::text,
  created_at timestamp with time zone null default now(),
  executive_summary text null,
  relevant_case_study text null,
  lead_research_depth text null,
  company_metadata jsonb null default '{}'::jsonb,
  country text null default 'India'::text,
  constraint leads_pkey primary key (id),
  constraint leads_signal_id_fkey foreign KEY (signal_id) references raw_signals (id) on delete set null,
  constraint leads_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.interactions (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  contact_id uuid not null,
  user_id uuid not null,
  type text not null,
  content text null,
  metadata jsonb null default '{}'::jsonb,
  constraint interactions_pkey primary key (id),
  constraint interactions_contact_id_fkey foreign KEY (contact_id) references contacts (id) on delete CASCADE,
  constraint interactions_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_interactions_contact_id on public.interactions using btree (contact_id) TABLESPACE pg_default;

create table public.contacts (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  lead_id uuid not null,
  user_id uuid not null,
  name text not null,
  title text null,
  linkedin_url text null,
  label text null,
  reasoning text null,
  status text null default 'identified'::text,
  constraint contacts_pkey primary key (id),
  constraint contacts_lead_id_fkey foreign KEY (lead_id) references leads (id) on delete CASCADE,
  constraint contacts_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint contacts_status_check check (
    (
      status = any (
        array[
          'identified'::text,
          'to_contact'::text,
          'contacted'::text,
          'replied'::text,
          'do_not_contact'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_contacts_lead_id on public.contacts using btree (lead_id) TABLESPACE pg_default;

```



## User Profile and Feed sources

user can manage their profile and settings. 

### Features
- We should be able to pull up all details from their website and present them with draft business_context
- we need to add their offerings and past projects and clients
- they should be able to manage filter and target and ICP
- add settings and integrations

### Tables 

```sql
create table public.profiles (
  id uuid not null,
  full_name text null,
  lead_quota_monthly integer null default 100,
  sync_frequency_hours integer null default 6,
  is_premium boolean null default false,
  updated_at timestamp with time zone null default now(),
  business_context jsonb null,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.feed_sources (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  url text not null,
  label text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  type text null default 'rss'::text,
  api_config jsonb null default '{}'::jsonb,
  constraint feed_sources_pkey primary key (id),
  constraint feed_sources_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

```

## Styling and State Management
We need to upgrade styling to match new direction. It should be minimal, sleek

## Instructions and Key things to consider
- Signal and contextual research: because we collect signals for both users and general we have to figure out how to deal with research that we add to signal for a user. because its going to be contextual based on their company profiles and filters. Do we need an intermidiate table for staging signals.
    - some signals (general ones) can be used by many users
- Ask me for clarifications
- give me few examples for style from websites which would be best fit, I can pick one and we will adapt that
- Lets break down work in key sprints ( output that as markdown codeblock)

