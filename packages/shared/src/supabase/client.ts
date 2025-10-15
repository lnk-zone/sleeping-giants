import { createClient, type SupabaseClient, type SupabaseClientOptions, type Session } from '@supabase/supabase-js';
import { UserRole, type UserSession } from '../contracts.js';

export interface SupabaseCredentials {
  url: string;
  key: string;
}

export const TENANT_ID_CLAIM = 'tenant_id';
export const TENANT_ROLES_CLAIM = 'tenant_roles';

export type TenantAwareSupabaseClient<
  Database = Record<string, unknown>,
  SchemaName extends string = 'public'
> = SupabaseClient<Database, SchemaName>;

export const createTenantAwareClient = <
  Database = Record<string, unknown>,
  SchemaName extends string = 'public'
>(
  credentials: SupabaseCredentials,
  options?: SupabaseClientOptions<SchemaName>
): TenantAwareSupabaseClient<Database, SchemaName> =>
  createClient<Database, SchemaName>(credentials.url, credentials.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: typeof window !== 'undefined',
    },
    ...options,
  });

export const createServiceRoleClient = <
  Database = Record<string, unknown>,
  SchemaName extends string = 'public'
>(
  credentials: SupabaseCredentials,
  options?: SupabaseClientOptions<SchemaName>
): TenantAwareSupabaseClient<Database, SchemaName> =>
  createClient<Database, SchemaName>(credentials.url, credentials.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...options,
    global: {
      ...(options?.global ?? {}),
      headers: {
        ...(options?.global?.headers ?? {}),
      },
    },
  });

export interface EmailPasswordAuthParams {
  email: string;
  password: string;
  tenantId?: string;
  data?: Record<string, unknown>;
}

export const signInWithEmail = async (
  client: SupabaseClient,
  params: EmailPasswordAuthParams
) =>
  client.auth.signInWithPassword({
    email: params.email,
    password: params.password,
    options: {
      data: {
        ...(params.data ?? {}),
        ...(params.tenantId ? { [TENANT_ID_CLAIM]: params.tenantId } : {}),
      },
    },
  });

export interface OauthAuthParams {
  provider: Parameters<SupabaseClient['auth']['signInWithOAuth']>[0]['provider'];
  redirectTo?: string;
  tenantId?: string;
  scopes?: string;
  queryParams?: Record<string, string>;
}

export const signInWithOAuth = (
  client: SupabaseClient,
  params: OauthAuthParams
) =>
  client.auth.signInWithOAuth({
    provider: params.provider,
    options: {
      redirectTo: params.redirectTo,
      scopes: params.scopes,
      queryParams: {
        ...(params.queryParams ?? {}),
        ...(params.tenantId ? { [TENANT_ID_CLAIM]: params.tenantId } : {}),
      },
    },
  });

export const signOut = (client: SupabaseClient) => client.auth.signOut();

export const toUserSession = (session: Session | null): UserSession | null => {
  if (!session || !session.user) {
    return null;
  }

  const metadata = {
    app: session.user.app_metadata ?? {},
    user: session.user.user_metadata ?? {},
  } satisfies UserSession['metadata'];

  const tenantId =
    (metadata.user?.[TENANT_ID_CLAIM] as string | undefined) ??
    (metadata.app?.[TENANT_ID_CLAIM] as string | undefined);

  if (!tenantId) {
    return null;
  }

  const roles: UserRole[] = Array.isArray(metadata.app?.[TENANT_ROLES_CLAIM])
    ? (metadata.app?.[TENANT_ROLES_CLAIM] as UserRole[])
    : Array.isArray(metadata.user?.[TENANT_ROLES_CLAIM])
    ? (metadata.user?.[TENANT_ROLES_CLAIM] as UserRole[])
    : [UserRole.EDITOR];

  const expiresAt = session.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  return {
    id: session.user.id,
    tenantId,
    userId: session.user.id,
    roles,
    expiresAt,
    refreshedAt: new Date().toISOString(),
    metadata,
  };
};

export const requireTenantSession = (session: Session | null): UserSession => {
  const userSession = toUserSession(session);
  if (!userSession) {
    throw new Error('Tenant-aware session is required but was not found.');
  }
  return userSession;
};
