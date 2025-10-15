import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import type { IssueCacheStateRow } from './cache.js';

export interface TenantRow {
  id: string;
  status: 'active' | 'suspended' | 'archived';
}

export interface NewsletterRow {
  id: string;
  tenant_id: string;
  name: string;
  provider: 'beehiiv' | 'custom';
  external_id: string | null;
  metadata: Record<string, any> | null;
}

export interface TenantSettingsRow {
  tenant_id: string;
  theme: string;
  card_layout: string;
  cta_variant: string;
  preferences: Record<string, any> | null;
  logo_path: string | null;
  theme_asset_paths: any[] | null;
  updated_at: string;
}

export interface ApiCredentialsRow {
  tenant_id: string;
  beehiiv_key_encrypted: string | null;
  beehiiv_key_nonce: string | null;
  beehiiv_key_key_id: string | null;
}

export type NewsletterSelectResponse = PostgrestSingleResponse<NewsletterRow[]>;
export type TenantSettingsSelectResponse = PostgrestSingleResponse<TenantSettingsRow[]>;
export type ApiCredentialsSelectResponse = PostgrestSingleResponse<ApiCredentialsRow[]>;
export type IssueCacheSelectResponse = PostgrestSingleResponse<IssueCacheStateRow[]>;
