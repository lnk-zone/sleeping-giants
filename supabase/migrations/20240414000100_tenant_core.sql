create extension if not exists "pgsodium";
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists citext;

-- Shared helper functions ----------------------------------------------------
create or replace function public.current_tenant_id()
  returns uuid
  language plpgsql
  stable
as
$$
declare
  claims jsonb;
  tenant uuid;
begin
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception
    when others then
      return null;
  end;

  if claims ? 'tenant_id' then
    tenant := (claims ->> 'tenant_id')::uuid;
  elsif claims ? 'app_metadata' and (claims -> 'app_metadata') ? 'tenant_id' then
    tenant := ((claims -> 'app_metadata') ->> 'tenant_id')::uuid;
  elsif claims ? 'user_metadata' and (claims -> 'user_metadata') ? 'tenant_id' then
    tenant := ((claims -> 'user_metadata') ->> 'tenant_id')::uuid;
  end if;

  return tenant;
end;
$$;

create or replace function public.claim_roles()
  returns text[]
  language plpgsql
  stable
as
$$
declare
  claims jsonb;
  raw jsonb;
  result text[] := array[]::text[];
begin
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception
    when others then
      return result;
  end;

  if claims ? 'tenant_roles' then
    raw := claims -> 'tenant_roles';
  elsif claims ? 'app_metadata' and (claims -> 'app_metadata') ? 'tenant_roles' then
    raw := (claims -> 'app_metadata') -> 'tenant_roles';
  elsif claims ? 'user_metadata' and (claims -> 'user_metadata') ? 'tenant_roles' then
    raw := (claims -> 'user_metadata') -> 'tenant_roles';
  end if;

  if raw is null or jsonb_typeof(raw) <> 'array' then
    return result;
  end if;

  select coalesce(array_agg(value::text), result) into result
  from jsonb_array_elements_text(raw);

  return result;
end;
$$;

create or replace function public.has_tenant_role(target_role text)
  returns boolean
  language sql
  stable
as
$$
  select exists (
    select 1 from unnest(public.claim_roles()) role where role = target_role
  );
$$;

create or replace function public.is_service_role()
  returns boolean
  language sql
  stable
as
$$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  ) = 'service_role';
$$;

-- Enumerated types -----------------------------------------------------------
create type public.tenant_status as enum ('active', 'suspended', 'archived');
create type public.tenant_plan as enum ('starter', 'growth', 'enterprise');
create type public.newsletter_provider as enum ('beehiiv', 'custom');
create type public.newsletter_visibility as enum ('private', 'public', 'unlisted');
create type public.card_layout as enum ('hero', 'grid', 'stacked', 'featured');
create type public.cta_variant as enum ('primary', 'secondary', 'ghost', 'link');
create type public.theme_style as enum ('light', 'dark', 'brand');
create type public.user_role as enum ('owner', 'admin', 'editor', 'analyst');
create type public.issue_status as enum ('open', 'in_progress', 'resolved');
create type public.issue_impact as enum ('low', 'medium', 'high');
create type public.save_source as enum ('automation', 'manual', 'imported');
create type public.referral_status as enum ('not_started', 'in_progress', 'completed');
create type public.subscription_event_type as enum (
  'issue_published',
  'issue_scheduled',
  'subscriber_created',
  'subscriber_updated',
  'subscriber_unsubscribed'
);
create type public.asset_type as enum ('logo', 'wordmark', 'icon', 'banner');
create type public.issue_section_type as enum ('hero', 'highlight', 'body', 'cta', 'footer');

-- Tenancy tables -------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  name text not null,
  status public.tenant_status not null default 'active',
  plan public.tenant_plan not null default 'starter',
  primary_domain text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  theme public.theme_style not null default 'brand',
  card_layout public.card_layout not null default 'hero',
  cta_variant public.cta_variant not null default 'primary',
  preferences jsonb not null default '{}'::jsonb,
  email_from text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  provider public.newsletter_provider not null,
  external_id text,
  description text,
  visibility public.newsletter_visibility not null default 'public',
  card_layout public.card_layout not null default 'hero',
  cta_variant public.cta_variant not null default 'primary',
  theme_style public.theme_style not null default 'brand',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, name)
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  newsletter_id uuid not null references public.newsletters(id) on delete cascade,
  issue_number integer,
  title text not null,
  description text,
  status public.issue_status not null default 'open',
  impact public.issue_impact not null default 'medium',
  tags text[] not null default array[]::text[],
  metadata jsonb default '{}'::jsonb,
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (newsletter_id, issue_number)
);

create table if not exists public.issue_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  issue_id uuid not null references public.issues(id) on delete cascade,
  section_type public.issue_section_type not null,
  headline text,
  content jsonb not null,
  position integer not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (issue_id, position)
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  email citext not null,
  role public.user_role not null default 'editor',
  display_name text,
  avatar_url text,
  last_sign_in_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, auth_user_id)
);

create or replace function public.is_tenant_member(target_tenant uuid)
  returns boolean
  language sql
  stable
as
$$
  select exists (
    select 1
    from public.user_profiles up
    where up.tenant_id = target_tenant
      and up.auth_user_id = auth.uid()
  );
$$;

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  issue_id uuid references public.issues(id) on delete set null,
  source public.save_source not null,
  notes text,
  tags text[] not null default array[]::text[],
  saved_at timestamptz not null default timezone('utc', now()),
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, user_profile_id)
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  code text not null,
  total_referrals integer not null default 0,
  status public.referral_status not null default 'not_started',
  milestones jsonb not null default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, code)
);

-- Secure API credential storage ---------------------------------------------
create table if not exists public.api_credentials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  beehiiv_key_encrypted bytea,
  beehiiv_key_nonce bytea,
  beehiiv_key_encrypted_at timestamptz,
  beehiiv_key_key_id uuid,
  openai_key_encrypted bytea,
  openai_key_nonce bytea,
  openai_key_encrypted_at timestamptz,
  openai_key_key_id uuid,
  rotation_version integer not null default 1,
  rotated_at timestamptz,
  created_by uuid references auth.users(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id)
);

do
$$
begin
  if not exists (
    select 1 from pgsodium.key where name = 'tenant_api_credentials_root'
  ) then
    perform pgsodium.create_key(name => 'tenant_api_credentials_root', comment => 'Root wrapping key for tenant API secrets');
  end if;
end;
$$;

create or replace function public.decrypt_secret(
  cipher bytea,
  nonce bytea,
  key_id uuid
)
  returns text
  language plpgsql
  security definer
  stable
as
$$
declare
  key_data bytea;
begin
  if cipher is null or nonce is null or key_id is null then
    return null;
  end if;

  key_data := pgsodium.get_key(key_id => key_id);

  return convert_from(
    pgsodium.crypto_aead_det_decrypt(cipher, nonce, '', key_data),
    'utf8'
  );
end;
$$;

revoke all on function public.decrypt_secret(bytea, bytea, uuid) from public;
grant execute on function public.decrypt_secret(bytea, bytea, uuid) to service_role;

-- Assets --------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_type public.asset_type not null default 'logo',
  path text not null,
  alt_text text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, asset_type)
);

-- Subscription events -------------------------------------------------------
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  newsletter_id uuid not null references public.newsletters(id) on delete cascade,
  event_type public.subscription_event_type not null,
  source public.newsletter_provider not null,
  payload jsonb not null,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

-- Indexing ------------------------------------------------------------------
create index if not exists idx_newsletters_tenant on public.newsletters (tenant_id);
create index if not exists idx_issues_tenant on public.issues (tenant_id);
create index if not exists idx_issue_sections_issue on public.issue_sections (issue_id);
create index if not exists idx_user_profiles_auth on public.user_profiles (auth_user_id);
create index if not exists idx_saves_user on public.saves (user_profile_id);
create index if not exists idx_streaks_user on public.streaks (user_profile_id);
create index if not exists idx_referrals_code on public.referrals (code);
create index if not exists idx_api_credentials_tenant on public.api_credentials (tenant_id);
create index if not exists idx_assets_tenant on public.assets (tenant_id);
create index if not exists idx_subscription_events_tenant on public.subscription_events (tenant_id);

-- Row Level Security --------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.newsletters enable row level security;
alter table public.issues enable row level security;
alter table public.issue_sections enable row level security;
alter table public.user_profiles enable row level security;
alter table public.saves enable row level security;
alter table public.streaks enable row level security;
alter table public.referrals enable row level security;
alter table public.api_credentials enable row level security;
alter table public.assets enable row level security;
alter table public.subscription_events enable row level security;

create policy tenant_read_access on public.tenants
  for select
  using (public.is_service_role() or id = public.current_tenant_id());

create policy tenant_admin_manage on public.tenants
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

create policy tenant_settings_access on public.tenant_settings
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

create policy newsletters_access on public.newsletters
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

create policy issues_access on public.issues
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

create policy issue_sections_access on public.issue_sections
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

create policy user_profiles_select on public.user_profiles
  for select
  using (
    public.is_service_role()
    or (auth.uid() = auth_user_id and tenant_id = public.current_tenant_id())
    or public.has_tenant_role('owner')
    or public.has_tenant_role('admin')
  );

create policy user_profiles_manage on public.user_profiles
  for all
  using (
    public.is_service_role()
    or tenant_id = public.current_tenant_id()
      and (public.has_tenant_role('owner') or public.has_tenant_role('admin'))
  )
  with check (
    public.is_service_role()
    or tenant_id = public.current_tenant_id()
  );

create policy saves_access on public.saves
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

create policy streaks_access on public.streaks
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

create policy referrals_access on public.referrals
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

create policy api_credentials_read on public.api_credentials
  for select
  using (
    public.is_service_role()
    or tenant_id = public.current_tenant_id()
      and (public.has_tenant_role('owner') or public.has_tenant_role('admin'))
  );

create policy api_credentials_manage on public.api_credentials
  for all
  using (
    public.is_service_role()
    or tenant_id = public.current_tenant_id()
      and (public.has_tenant_role('owner') or public.has_tenant_role('admin'))
  )
  with check (
    public.is_service_role()
    or tenant_id = public.current_tenant_id()
  );

create policy assets_access on public.assets
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

create policy subscription_events_access on public.subscription_events
  for select
  using (
    public.is_service_role()
    or tenant_id = public.current_tenant_id()
    or public.is_tenant_member(tenant_id)
  );

create policy subscription_events_insert on public.subscription_events
  for insert
  with check (
    public.is_service_role()
    or tenant_id = public.current_tenant_id()
  );

-- Ensure views/functions cannot be altered by tenants -----------------------
revoke all on schema public from anon;
revoke all on schema public from authenticated;

grant usage on schema public to anon;
grant usage on schema public to authenticated;

-- Access to helper functions
grant execute on function public.current_tenant_id to authenticated, anon;
grant execute on function public.has_tenant_role(text) to authenticated, anon;
grant execute on function public.claim_roles() to authenticated, anon;
grant execute on function public.is_tenant_member(uuid) to authenticated, anon;
