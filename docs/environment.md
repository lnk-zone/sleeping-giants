# Environment configuration

This workspace separates platform-owned secrets from tenant-provided credentials. Use the following manifests to bootstrap new deployments:

## Platform-level secrets (`.env.platform`)

These values should be managed by the platform team and injected into runtime environments. They are **not** distributed to tenants.

- `SUPABASE_URL` – Base URL for the shared Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key with elevated Supabase permissions.
- `OPENAI_API_KEY` – Platform-managed API key for OpenAI access.
- `BEEHIIV_API_KEY` – Server-side Beehiiv token for administrative operations.

## Tenant or developer inputs (`.env.local.template`)

These variables must be supplied per tenant or developer environment. Copy the template to `.env.local` (or the appropriate runtime manifest) and fill in the values.

- `SUPABASE_ANON_KEY` – Anonymous Supabase key scoped to the tenant-facing application.
- `SUPABASE_DATABASE_PASSWORD` – Tenant-specific database password or connection secret.
- `OPENAI_PROJECT_ID` – Identifier for the OpenAI project used by this workspace.
- `BEEHIIV_PUBLICATION_ID` – Beehiiv publication identifier for newsletter actions.
- `MCP_API_KEY` – API key required to access the MCP service.
- `MCP_RATE_LIMIT_MAX` / `MCP_RATE_LIMIT_WINDOW` – Optional overrides for request throttling.
- `MCP_LATENCY_BUDGET_MS` – Target response time budget used by latency enforcement.
- `MCP_ISSUE_SUGGESTION_LIMIT` – Default limit for issue list queries.
- `MCP_REFERRAL_MILESTONES` – JSON array describing referral progress milestones.
- `MCP_TENANT_ID` – Tenant identifier used by the MCP worker for in-memory persistence.
- `NEWSLETTER_SYNC_CACHE_TTL_MINUTES` – Minutes to warm Beehiiv cache (clamped between 15 and 60).
- `NEWSLETTER_SYNC_ASSETS_BUCKET` – Supabase Storage bucket for publication logos and theme assets.
- `NEWSLETTER_SYNC_IMAGE_MAX_WIDTH` – Maximum pixel width when resizing downloaded branding assets.
- `NEWSLETTER_SYNC_IMAGE_QUALITY` – Output quality (0–100) for compressed branding images.
- `NEWSLETTER_SYNC_MAX_RETRIES` – Maximum retry attempts before surfacing sync warnings.

Keep sensitive files such as `.env.platform` out of source control. Tenant templates can be committed to help bootstrap new environments, but replace secrets with placeholders.
