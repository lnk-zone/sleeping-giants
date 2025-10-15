import { BeehiivWorker } from '@sleeping-giants/data';
import type { PrdPost } from '@sleeping-giants/data';
import {
  createServiceRoleClient,
  type TenantAwareSupabaseClient,
} from '@sleeping-giants/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { v5 as uuidv5 } from 'uuid';
import { ensureBrandingAssets, type BrandingMetadata } from './assets.js';
import {
  computeBackoffDelayMinutes,
  computeNextExpiry,
  shouldWarmCache,
  type IssueCacheStateRow,
} from './cache.js';
import { loadConfig, type SyncConfig } from './config.js';
import type {
  ApiCredentialsRow,
  NewsletterRow,
  TenantSettingsRow,
} from './types.js';

const ISSUE_NAMESPACE = uuidv5('https://sleepinggiants.dev/newsletter-issue', uuidv5.URL);
const SECTION_NAMESPACE = uuidv5('https://sleepinggiants.dev/newsletter-section', uuidv5.URL);

interface SyncContext {
  supabase: TenantAwareSupabaseClient;
  config: SyncConfig;
}

const createLogger = (tenantId: string, newsletterId: string) => ({
  info: (message: string, meta?: Record<string, unknown>) =>
    console.info('[newsletter-sync]', { tenantId, newsletterId, message, ...(meta ?? {}) }),
  warn: (message: string, meta?: Record<string, unknown>) =>
    console.warn('[newsletter-sync]', { tenantId, newsletterId, message, ...(meta ?? {}) }),
  error: (message: string, meta?: Record<string, unknown>) =>
    console.error('[newsletter-sync]', { tenantId, newsletterId, message, ...(meta ?? {}) }),
});

const toBrandingMetadata = (newsletter: NewsletterRow): BrandingMetadata => {
  const branding =
    (newsletter.metadata?.branding as BrandingMetadata | undefined | null) ?? undefined;
  if (!branding) {
    return {};
  }
  return branding;
};

const fetchActiveTenants = async (
  supabase: SupabaseClient,
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to fetch active tenants: ${error.message}`);
  }

  return (data ?? []).map((tenant) => tenant.id);
};

const fetchBeehiivNewsletters = async (
  supabase: SupabaseClient,
  tenantIds: string[],
): Promise<NewsletterRow[]> => {
  if (tenantIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('newsletters')
    .select('id, tenant_id, name, provider, external_id, metadata')
    .eq('provider', 'beehiiv')
    .in('tenant_id', tenantIds);

  if (error) {
    throw new Error(`Failed to fetch Beehiiv newsletters: ${error.message}`);
  }

  return (data ?? []).filter((newsletter) => {
    const syncDisabled = Boolean(newsletter.metadata?.syncDisabled);
    return !syncDisabled;
  });
};

const fetchTenantSettings = async (
  supabase: SupabaseClient,
  tenantIds: string[],
): Promise<Map<string, TenantSettingsRow>> => {
  if (tenantIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('tenant_settings')
    .select('tenant_id, theme, card_layout, cta_variant, preferences, logo_path, theme_asset_paths, updated_at')
    .in('tenant_id', tenantIds);

  if (error) {
    throw new Error(`Failed to fetch tenant settings: ${error.message}`);
  }

  const map = new Map<string, TenantSettingsRow>();
  for (const row of data ?? []) {
    map.set(row.tenant_id, row as TenantSettingsRow);
  }
  return map;
};

const fetchApiCredentials = async (
  supabase: SupabaseClient,
  tenantIds: string[],
): Promise<Map<string, ApiCredentialsRow>> => {
  if (tenantIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('api_credentials')
    .select('tenant_id, beehiiv_key_encrypted, beehiiv_key_nonce, beehiiv_key_key_id')
    .in('tenant_id', tenantIds);

  if (error) {
    throw new Error(`Failed to fetch API credentials: ${error.message}`);
  }

  const map = new Map<string, ApiCredentialsRow>();
  for (const row of data ?? []) {
    map.set(row.tenant_id, row as ApiCredentialsRow);
  }
  return map;
};

const fetchCacheStates = async (
  supabase: SupabaseClient,
  newsletterIds: string[],
): Promise<Map<string, IssueCacheStateRow>> => {
  if (newsletterIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('issue_cache_state')
    .select('*')
    .in('newsletter_id', newsletterIds);

  if (error) {
    throw new Error(`Failed to fetch cache state: ${error.message}`);
  }

  const map = new Map<string, IssueCacheStateRow>();
  for (const row of data ?? []) {
    map.set(row.newsletter_id, row as IssueCacheStateRow);
  }
  return map;
};

const decryptBeehiivKey = async (
  supabase: SupabaseClient,
  credentials: ApiCredentialsRow | undefined,
): Promise<string | null> => {
  if (!credentials) {
    return null;
  }
  const { beehiiv_key_encrypted, beehiiv_key_nonce, beehiiv_key_key_id } = credentials;
  if (!beehiiv_key_encrypted || !beehiiv_key_nonce || !beehiiv_key_key_id) {
    return null;
  }

  const { data, error } = await supabase.rpc<string>('decrypt_secret', {
    cipher: beehiiv_key_encrypted,
    nonce: beehiiv_key_nonce,
    key_id: beehiiv_key_key_id,
  });

  if (error) {
    throw new Error(`Failed to decrypt Beehiiv key: ${error.message}`);
  }

  return data ?? null;
};

const toIssueId = (newsletterId: string, postId: string): string =>
  uuidv5(`${newsletterId}:${postId}`, ISSUE_NAMESPACE);

const toSectionId = (issueId: string, section: string): string =>
  uuidv5(`${issueId}:${section}`, SECTION_NAMESPACE);

const toPlainText = (html: string): string =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const upsertIssue = async (
  supabase: SupabaseClient,
  newsletter: NewsletterRow,
  post: PrdPost,
): Promise<string> => {
  const issueId = toIssueId(newsletter.id, post.id);
  const nowIso = new Date().toISOString();
  const plain = post.bodyPlain ?? toPlainText(post.body);

  const issuePayload = {
    id: issueId,
    tenant_id: newsletter.tenant_id,
    newsletter_id: newsletter.id,
    source_id: post.id,
    title: post.title,
    description: post.excerpt,
    tags: post.tags,
    metadata: {
      source: post.source,
      source_url: post.url,
      hero_image_url: post.heroImageUrl ?? null,
      author: post.author ?? null,
    },
    published_at: post.publishedAt,
    updated_at: post.updatedAt,
    body_plain: plain,
    status: 'resolved',
    impact: 'medium',
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { error } = await supabase
    .from('issues')
    .upsert(issuePayload, { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to upsert issue for post ${post.id}: ${error.message}`);
  }

  return issueId;
};

const syncIssueSections = async (
  supabase: SupabaseClient,
  issueId: string,
  newsletter: NewsletterRow,
  post: PrdPost,
): Promise<void> => {
  const tenantId = newsletter.tenant_id;
  const sections = [
    {
      id: toSectionId(issueId, 'hero'),
      tenant_id: tenantId,
      issue_id: issueId,
      section_type: 'hero',
      headline: post.title,
      content: {
        excerpt: post.excerpt,
        heroImageUrl: post.heroImageUrl ?? null,
        author: post.author ?? null,
        tags: post.tags,
        url: post.url,
      },
      position: 0,
      updated_at: new Date().toISOString(),
    },
    {
      id: toSectionId(issueId, 'body'),
      tenant_id: tenantId,
      issue_id: issueId,
      section_type: 'body',
      headline: post.title,
      content: {
        html: post.body,
        plainText: post.bodyPlain ?? toPlainText(post.body),
      },
      position: 1,
      updated_at: new Date().toISOString(),
    },
  ];

  const { data: existing, error: existingError } = await supabase
    .from('issue_sections')
    .select('id')
    .eq('issue_id', issueId);

  if (existingError) {
    throw new Error(`Failed to query existing sections for issue ${issueId}: ${existingError.message}`);
  }

  const { error } = await supabase
    .from('issue_sections')
    .upsert(sections, { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to upsert sections for issue ${issueId}: ${error.message}`);
  }

  const keepIds = new Set(sections.map((section) => section.id));
  const toDelete = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('issue_sections')
      .delete()
      .in('id', toDelete);

    if (deleteError) {
      throw new Error(`Failed to prune stale sections for issue ${issueId}: ${deleteError.message}`);
    }
  }
};

const updateCacheState = async (
  supabase: SupabaseClient,
  newsletter: NewsletterRow,
  status: string,
  patch: Partial<IssueCacheStateRow> & { metadata?: Record<string, unknown> },
): Promise<void> => {
  const now = new Date().toISOString();
  const payload = {
    tenant_id: newsletter.tenant_id,
    newsletter_id: newsletter.id,
    status,
    updated_at: now,
    ...patch,
  };

  const { error } = await supabase
    .from('issue_cache_state')
    .upsert(payload, { onConflict: 'newsletter_id' });

  if (error) {
    throw new Error(`Failed to update cache state for newsletter ${newsletter.id}: ${error.message}`);
  }
};

const synchronizeNewsletter = async (
  context: SyncContext,
  newsletter: NewsletterRow,
  settings: TenantSettingsRow | undefined,
  credentials: ApiCredentialsRow | undefined,
  cacheState: IssueCacheStateRow | undefined,
): Promise<void> => {
  const logger = createLogger(newsletter.tenant_id, newsletter.id);
  const now = new Date();

  if (!shouldWarmCache(cacheState ?? null, now)) {
    logger.info('skipping sync because cache is fresh or in backoff');
    return;
  }

  await updateCacheState(context.supabase, newsletter, 'warming', {
    last_warmed_at: cacheState?.last_warmed_at ?? null,
    metadata: {
      ...(cacheState?.metadata ?? {}),
      startedAt: now.toISOString(),
    },
  });

  try {
    if (settings) {
      await ensureBrandingAssets(settings, toBrandingMetadata(newsletter), {
        supabase: context.supabase,
        bucket: context.config.assetsBucket,
        tenantId: newsletter.tenant_id,
        maxWidth: context.config.imageMaxWidth,
        quality: context.config.imageQuality,
        logger: (message, meta) => logger.info(message, meta),
      });
    } else {
      logger.warn('missing tenant settings; skipping branding asset sync');
    }

    const beehiivKey = await decryptBeehiivKey(context.supabase, credentials);
    if (!beehiivKey) {
      throw new Error('Missing Beehiiv API credentials for tenant');
    }

    if (!newsletter.external_id) {
      throw new Error('Missing Beehiiv publication identifier (external_id) for newsletter');
    }

    const worker = new BeehiivWorker({
      apiKey: beehiivKey,
      publicationId: newsletter.external_id,
      logger,
    });

    const posts = await worker.run();
    logger.info('fetched posts from Beehiiv', { count: posts.length });

    for (const post of posts) {
      const issueId = await upsertIssue(context.supabase, newsletter, post);
      await syncIssueSections(context.supabase, issueId, newsletter, post);
    }

    const expiresAt = computeNextExpiry(now, context.config.cacheTtlMinutes);

    await updateCacheState(context.supabase, newsletter, 'warm', {
      last_warmed_at: now.toISOString(),
      expires_at: expiresAt,
      retry_count: 0,
      next_retry_at: null,
      last_error: null,
      metadata: {
        ...(cacheState?.metadata ?? {}),
        posts: posts.length,
        completedAt: new Date().toISOString(),
      },
    });

    logger.info('newsletter sync completed', { posts: posts.length, expiresAt });
  } catch (error) {
    const retryCount = (cacheState?.retry_count ?? 0) + 1;
    const delayMinutes = computeBackoffDelayMinutes(retryCount);
    const nextRetryAt = new Date(now.getTime() + delayMinutes * 60 * 1000).toISOString();
    const message = error instanceof Error ? error.message : String(error);

    logger.error('newsletter sync failed', {
      error: message,
      retryCount,
      nextRetryAt,
    });

    await updateCacheState(context.supabase, newsletter, 'error', {
      retry_count: retryCount,
      next_retry_at: nextRetryAt,
      last_error: message,
      expires_at: null,
      metadata: {
        ...(cacheState?.metadata ?? {}),
        failedAt: now.toISOString(),
        retryCount,
      },
    });

    if (retryCount >= context.config.maxRetryAttempts) {
      logger.warn('maximum retry attempts reached for newsletter', {
        retryCount,
      });
    }
  }
};

export const runSync = async (): Promise<void> => {
  const config = loadConfig();
  const supabase = createServiceRoleClient({
    url: config.supabaseUrl,
    key: config.supabaseServiceRoleKey,
  });

  const tenantIds = await fetchActiveTenants(supabase);
  const newsletters = await fetchBeehiivNewsletters(supabase, tenantIds);
  const newsletterIds = newsletters.map((newsletter) => newsletter.id);

  const [settingsMap, credentialsMap, cacheMap] = await Promise.all([
    fetchTenantSettings(supabase, tenantIds),
    fetchApiCredentials(supabase, tenantIds),
    fetchCacheStates(supabase, newsletterIds),
  ]);

  const context: SyncContext = { supabase, config };

  for (const newsletter of newsletters) {
    const settings = settingsMap.get(newsletter.tenant_id);
    const credentials = credentialsMap.get(newsletter.tenant_id);
    const cacheState = cacheMap.get(newsletter.id);
    await synchronizeNewsletter(context, newsletter, settings, credentials, cacheState);
  }
};
