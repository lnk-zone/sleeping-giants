-- === Newsletter sync enhancements ============================================

-- Extend tenant settings with asset linkage columns
alter table public.tenant_settings
  add column if not exists logo_path text,
  add column if not exists theme_asset_paths jsonb not null default '[]'::jsonb;

-- Extend issues with source metadata and search helpers
alter table public.issues
  add column if not exists source_id text,
  add column if not exists body_plain text;

create unique index if not exists idx_issues_newsletter_source
  on public.issues (newsletter_id, source_id);

alter table public.issues
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_plain, '')), 'C')
  ) stored;

create index if not exists idx_issues_search_vector on public.issues using gin (search_vector);

-- Cache metadata for warmed issues per tenant/newsletter
create table if not exists public.issue_cache_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  newsletter_id uuid not null references public.newsletters(id) on delete cascade,
  last_warmed_at timestamptz,
  expires_at timestamptz,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  last_error text,
  status text not null default 'idle',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (newsletter_id)
);

create index if not exists idx_issue_cache_state_tenant on public.issue_cache_state (tenant_id);

alter table public.issue_cache_state enable row level security;

create policy issue_cache_state_access on public.issue_cache_state
  for all
  using (
    public.is_service_role()
    or tenant_id = public.current_tenant_id()
    or public.is_tenant_member(tenant_id)
  )
  with check (
    public.is_service_role()
    or tenant_id = public.current_tenant_id()
  );

