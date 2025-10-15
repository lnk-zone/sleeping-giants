import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TenantSettingsRow } from './types.js';

export interface BrandingAsset {
  url: string;
  name?: string;
}

export interface BrandingMetadata {
  logoUrl?: string | null;
  themeAssets?: Array<BrandingAsset | string> | null;
}

export interface AssetProcessorConfig {
  supabase: SupabaseClient;
  bucket: string;
  tenantId: string;
  maxWidth: number;
  quality: number;
  logger: (message: string, meta?: Record<string, unknown>) => void;
}

const normalizeThemeAssets = (
  assets: Array<BrandingAsset | string> | null | undefined,
): BrandingAsset[] => {
  if (!assets) {
    return [];
  }
  return assets
    .map((asset, index) =>
      typeof asset === 'string' ? { url: asset, name: `theme-${index + 1}` } : asset,
    )
    .filter((asset): asset is BrandingAsset => Boolean(asset?.url));
};

const fetchImageBuffer = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset from ${url} (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const transformImage = async (
  buffer: Buffer,
  maxWidth: number,
  quality: number,
): Promise<Buffer> =>
  sharp(buffer)
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
      fit: sharp.fit.inside,
    })
    .webp({
      quality,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();

const uploadAsset = async (
  client: SupabaseClient,
  bucket: string,
  path: string,
  payload: Buffer,
): Promise<void> => {
  const { error } = await client.storage.from(bucket).upload(path, payload, {
    cacheControl: '3600',
    contentType: 'image/webp',
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload processed asset to ${bucket}/${path}: ${error.message}`);
  }
};

const ensurePreferencesObject = (
  preferences: Record<string, any> | null,
): Record<string, any> => ({ ...(preferences ?? {}) });

export const ensureBrandingAssets = async (
  settings: TenantSettingsRow,
  branding: BrandingMetadata,
  context: AssetProcessorConfig,
): Promise<TenantSettingsRow> => {
  const nextSettings: TenantSettingsRow = { ...settings };
  const preferences = ensurePreferencesObject(settings.preferences);
  const brandingPrefs = ensurePreferencesObject(preferences.branding ?? null);

  let changed = false;

  if (branding.logoUrl) {
    const existingSource = brandingPrefs.logoSource as string | undefined;
    const shouldRefresh = !settings.logo_path || existingSource !== branding.logoUrl;

    if (shouldRefresh) {
      try {
        context.logger('processing logo asset', { url: branding.logoUrl });
        const sourceBuffer = await fetchImageBuffer(branding.logoUrl);
        const transformed = await transformImage(
          sourceBuffer,
          context.maxWidth,
          context.quality,
        );
        const storagePath = `logos/${context.tenantId}/logo.webp`;
        await uploadAsset(context.supabase, context.bucket, storagePath, transformed);

        const fullPath = `${context.bucket}/${storagePath}`;
        brandingPrefs.logoPath = fullPath;
        brandingPrefs.logoSource = branding.logoUrl;
        nextSettings.logo_path = fullPath;
        changed = true;
      } catch (error) {
        context.logger('failed to process logo asset', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const themeAssets = normalizeThemeAssets(branding.themeAssets);
  if (themeAssets.length > 0) {
    const existing = Array.isArray(brandingPrefs.themeAssets)
      ? (brandingPrefs.themeAssets as Array<{ sourceUrl?: string }>)
      : [];
    const existingUrls = new Set(existing.map((asset) => asset?.sourceUrl).filter(Boolean));
    const needsRefresh = themeAssets.some((asset) => !existingUrls.has(asset.url));

    if (needsRefresh) {
      const uploadedAssets: Array<Record<string, unknown>> = [];

      for (const [index, asset] of themeAssets.entries()) {
        try {
          context.logger('processing theme asset', { url: asset.url, index });
          const sourceBuffer = await fetchImageBuffer(asset.url);
          const transformed = await transformImage(
            sourceBuffer,
            context.maxWidth,
            context.quality,
          );
          const safeName = asset.name?.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || `theme-${index + 1}`;
          const storagePath = `logos/${context.tenantId}/${safeName}.webp`;
          await uploadAsset(context.supabase, context.bucket, storagePath, transformed);

          const record = {
            path: `${context.bucket}/${storagePath}`,
            sourceUrl: asset.url,
            name: asset.name ?? safeName,
          };
          uploadedAssets.push(record);
        } catch (error) {
          context.logger('failed to process theme asset', {
            url: asset.url,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (uploadedAssets.length > 0) {
        brandingPrefs.themeAssets = uploadedAssets;
        nextSettings.theme_asset_paths = uploadedAssets;
        changed = true;
      }
    }
  }

  if (!changed) {
    return nextSettings;
  }

  preferences.branding = brandingPrefs;
  nextSettings.preferences = preferences;
  nextSettings.updated_at = new Date().toISOString();

  const { data, error } = await context.supabase
    .from('tenant_settings')
    .update({
      preferences,
      logo_path: nextSettings.logo_path,
      theme_asset_paths: nextSettings.theme_asset_paths ?? [],
      updated_at: nextSettings.updated_at,
    })
    .eq('tenant_id', settings.tenant_id)
    .select()
    .single();

  if (error) {
    context.logger('failed to update tenant settings with asset paths', {
      error: error.message,
    });
    return nextSettings;
  }

  return data as TenantSettingsRow;
};
