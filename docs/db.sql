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



