-- === Metadata Optimization Tool Schema ========================================
-- This migration adds support for the metadata optimization workflow:
-- Use cases, golden prompts, metadata versions, and automated testing

-- === Use Case Management ======================================================
CREATE TABLE IF NOT EXISTS public.use_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),
  title TEXT NOT NULL,
  persona TEXT,
  context TEXT,
  success_criteria TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('active', 'planned', 'archived')),
  tools_required TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_use_cases_tenant ON public.use_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_use_cases_status ON public.use_cases(status);

ALTER TABLE public.use_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY use_cases_tenant_access ON public.use_cases
  FOR ALL
  USING (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
    OR public.is_tenant_member(tenant_id)
  )
  WITH CHECK (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
  );

-- === Golden Prompt Management =================================================
CREATE TABLE IF NOT EXISTS public.golden_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  use_case_id UUID REFERENCES public.use_cases(id) ON DELETE SET NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('direct', 'indirect', 'negative')),
  prompt_text TEXT NOT NULL,
  expected_behavior TEXT NOT NULL CHECK (expected_behavior IN ('surface_app', 'call_tool', 'do_nothing', 'use_alternative')),
  expected_tool TEXT,
  expected_params JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_golden_prompts_tenant ON public.golden_prompts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_golden_prompts_use_case ON public.golden_prompts(use_case_id);
CREATE INDEX IF NOT EXISTS idx_golden_prompts_type ON public.golden_prompts(prompt_type);

ALTER TABLE public.golden_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY golden_prompts_tenant_access ON public.golden_prompts
  FOR ALL
  USING (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
    OR public.is_tenant_member(tenant_id)
  )
  WITH CHECK (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
  );

-- === Metadata Versioning ======================================================
CREATE TABLE IF NOT EXISTS public.metadata_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  legal_info_url TEXT NOT NULL,
  tools JSONB NOT NULL DEFAULT '[]'::JSONB,
  based_on_version_id UUID REFERENCES public.metadata_versions(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(tenant_id, version)
);

CREATE INDEX IF NOT EXISTS idx_metadata_versions_tenant ON public.metadata_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_metadata_versions_published ON public.metadata_versions(is_published);

ALTER TABLE public.metadata_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY metadata_versions_tenant_access ON public.metadata_versions
  FOR ALL
  USING (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
    OR public.is_tenant_member(tenant_id)
  )
  WITH CHECK (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
  );

-- === Test Execution ===========================================================
CREATE TABLE IF NOT EXISTS public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metadata_version_id UUID NOT NULL REFERENCES public.metadata_versions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  overall_accuracy REAL,
  precision REAL,
  recall REAL,
  negative_accuracy REAL,
  total_prompts INTEGER,
  passed_prompts INTEGER,
  failed_prompts INTEGER,
  duration_seconds INTEGER,
  cost_usd NUMERIC(10, 6),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_test_runs_tenant ON public.test_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_metadata_version ON public.test_runs(metadata_version_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON public.test_runs(status);

ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY test_runs_tenant_access ON public.test_runs
  FOR ALL
  USING (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
    OR public.is_tenant_member(tenant_id)
  )
  WITH CHECK (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
  );

CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.golden_prompts(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  expected_behavior TEXT NOT NULL,
  actual_behavior TEXT,
  confidence REAL,
  latency_ms INTEGER,
  tool_called TEXT,
  parameters_passed JSONB,
  full_response JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_test_results_test_run ON public.test_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_prompt ON public.test_results(prompt_id);
CREATE INDEX IF NOT EXISTS idx_test_results_passed ON public.test_results(passed);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY test_results_tenant_access ON public.test_results
  FOR ALL
  USING (
    public.is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.test_runs
      WHERE id = test_run_id
      AND (tenant_id = public.current_tenant_id() OR public.is_tenant_member(tenant_id))
    )
  );

-- === Subscription Management ==================================================
-- Extend tenants table with subscription information
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON public.tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_trial_ends ON public.tenants(trial_ends_at);

-- === Helper Functions =========================================================

-- Function to auto-increment metadata version
CREATE OR REPLACE FUNCTION public.get_next_metadata_version(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
  INTO next_version
  FROM public.metadata_versions
  WHERE tenant_id = p_tenant_id;
  
  RETURN next_version;
END;
$$;

-- Function to set trial end date on tenant creation
CREATE OR REPLACE FUNCTION public.set_trial_end_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NEW.created_at + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_trial_end_date
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trial_end_date();

-- === Analytics Events =========================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  user_id TEXT,
  session_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant ON public.analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred ON public.analytics_events(occurred_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_events_tenant_access ON public.analytics_events
  FOR ALL
  USING (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
    OR public.is_tenant_member(tenant_id)
  )
  WITH CHECK (
    public.is_service_role()
    OR tenant_id = public.current_tenant_id()
  );

-- === Comments for Documentation ===============================================
COMMENT ON TABLE public.use_cases IS 'Defines the scenarios where the ChatGPT app should surface';
COMMENT ON TABLE public.golden_prompts IS 'Test prompt library for metadata optimization';
COMMENT ON TABLE public.metadata_versions IS 'Version control for ChatGPT app metadata';
COMMENT ON TABLE public.test_runs IS 'Automated test execution tracking';
COMMENT ON TABLE public.test_results IS 'Individual test result details';
COMMENT ON TABLE public.analytics_events IS 'Production analytics and telemetry';

