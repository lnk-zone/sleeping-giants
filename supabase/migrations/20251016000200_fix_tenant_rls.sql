-- Fix RLS policies to allow authenticated users to create tenants

-- Drop existing restrictive policies
DROP POLICY IF EXISTS tenant_admin_manage ON public.tenants;
DROP POLICY IF EXISTS tenant_read_access ON public.tenants;

-- Allow authenticated users to create their own tenant
CREATE POLICY tenant_insert_own ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to read their own tenant
CREATE POLICY tenant_select_own ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    is_service_role()
    OR id = current_tenant_id()
    OR auth.uid() IN (
      SELECT created_by FROM public.tenants WHERE id = tenants.id
    )
  );

-- Allow users to update their own tenant
CREATE POLICY tenant_update_own ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    is_service_role()
    OR id = current_tenant_id()
  )
  WITH CHECK (
    is_service_role()
    OR id = current_tenant_id()
  );

-- Service role can do everything
CREATE POLICY tenant_service_role_all ON public.tenants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add created_by column if it doesn't exist
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON public.tenants(created_by);

