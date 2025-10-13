import type { Issue } from '@sleeping-giants/shared/contracts.js';
import { Pool, type PoolClient, type QueryResult } from 'pg';
import {
  InMemoryIssueCache,
  type IssueCache,
  createIssueCacheKey,
} from './cache.js';
import { ISSUE_MIGRATIONS } from './migrations.js';
import { CacheWarmer } from './warmers.js';
import { withBackoff } from './retry.js';

export interface IssueStorageOptions {
  connectionString?: string;
  pool?: Pool;
  cache?: IssueCache;
  ttlMinutes?: number;
  warmIntervalMs?: number;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
  viewRefreshIntervalMs?: number;
  maxRetries?: number;
}

export interface ListIssuesOptions {
  limit?: number;
  offset?: number;
  status?: string;
  tags?: string[];
  useCache?: boolean;
}

export interface SearchIssuesOptions {
  limit?: number;
}

const DEFAULT_LOGGER: Pick<Console, 'info' | 'warn' | 'error'> = {
  info: (...args: unknown[]) => console.info('[issue-storage]', ...args),
  warn: (...args: unknown[]) => console.warn('[issue-storage]', ...args),
  error: (...args: unknown[]) => console.error('[issue-storage]', ...args),
};

const DEFAULT_VIEW_REFRESH_INTERVAL = 5 * 60 * 1000;

interface IssueRow {
  id: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  impact: string;
  created_at: Date | string;
  updated_at: Date | string;
  metadata: Record<string, unknown> | null;
}

const toIsoDate = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapRowToIssue = (row: IssueRow): Issue => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status as Issue['status'],
  tags: (row.tags ?? []) as Issue['tags'],
  impact: row.impact as Issue['impact'],
  createdAt: toIsoDate(row.created_at),
  updatedAt: toIsoDate(row.updated_at),
  metadata: row.metadata ?? undefined,
});

const clampTtlMinutes = (ttlMinutes?: number): number => {
  const value = ttlMinutes ?? 30;
  if (value < 15) {
    return 15;
  }
  if (value > 60) {
    return 60;
  }
  return value;
};

export class IssueStorage {
  private readonly pool: Pool;
  private readonly cache: IssueCache;
  private readonly logger: Pick<Console, 'info' | 'warn' | 'error'>;
  private readonly warmIntervalMs: number;
  private readonly viewRefreshIntervalMs: number;
  private readonly maxRetries: number;
  private warmerStop?: () => void;
  private lastViewRefresh = 0;
  private initialized = false;
  private readonly ownsPool: boolean;

  constructor(options: IssueStorageOptions = {}) {
    const connectionString = options.connectionString ?? process.env.DATABASE_URL;
    if (!options.pool && !connectionString) {
      throw new Error('IssueStorage requires a Postgres connection string or an existing pool.');
    }

    this.pool = options.pool ?? new Pool({ connectionString });
    this.cache = options.cache ?? new InMemoryIssueCache(options.ttlMinutes);
    this.logger = options.logger ?? DEFAULT_LOGGER;
    this.maxRetries = options.maxRetries ?? 3;
    const ttlMinutes = clampTtlMinutes(options.ttlMinutes);
    this.warmIntervalMs = options.warmIntervalMs ?? (ttlMinutes * 60 * 1000) / 2;
    this.viewRefreshIntervalMs = options.viewRefreshIntervalMs ?? DEFAULT_VIEW_REFRESH_INTERVAL;
    this.ownsPool = !options.pool;
  }

  private async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  private async runMigrations(): Promise<void> {
    await withBackoff(
      async () => {
        const client = await this.getClient();
        try {
          await client.query('BEGIN');
          for (const statement of ISSUE_MIGRATIONS) {
            await client.query(statement);
          }
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw error;
        } finally {
          client.release();
        }
      },
      {
        retries: this.maxRetries,
        onRetry: (error, attempt) => {
          this.logger.warn(`Retrying issue migrations (attempt ${attempt})`, error);
        },
      },
    );
  }

  private async refreshMaterializedViews(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastViewRefresh < this.viewRefreshIntervalMs) {
      return;
    }

    await withBackoff(
      async () => {
        await this.pool.query('REFRESH MATERIALIZED VIEW issue_search_documents');
        await this.pool.query('REFRESH MATERIALIZED VIEW issue_activity_daily');
      },
      {
        retries: this.maxRetries,
        onRetry: (error, attempt) => {
          this.logger.warn(`Retrying materialized view refresh (attempt ${attempt})`, error);
        },
      },
    );

    this.lastViewRefresh = now;
  }

  private ensureInitialized = async (): Promise<void> => {
    if (this.initialized) {
      return;
    }
    await this.runMigrations();
    await this.refreshMaterializedViews(true);

    if (this.warmIntervalMs > 0) {
      const warmer = new CacheWarmer({
        cache: this.cache,
        intervalMs: this.warmIntervalMs,
        logger: this.logger,
        loader: async () => this.listIssues({ limit: 50, useCache: false }),
      });
      this.warmerStop = warmer.start();
    }

    this.initialized = true;
  };

  async close(): Promise<void> {
    if (this.warmerStop) {
      this.warmerStop();
    }
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  private bindIssue(issue: Issue): (string | string[] | Record<string, unknown> | Date)[] {
    return [
      issue.id,
      issue.title,
      issue.description,
      issue.status,
      issue.tags,
      issue.impact,
      new Date(issue.createdAt),
      new Date(issue.updatedAt),
      issue.metadata ?? {},
    ];
  }

  private mapIssues(rows: IssueRow[]): Issue[] {
    return rows.map(mapRowToIssue);
  }

  async upsertIssues(issues: Issue[]): Promise<void> {
    if (issues.length === 0) {
      return;
    }

    await this.ensureInitialized();

    const values: unknown[] = [];
    const placeholders: string[] = [];

    issues.forEach((issue, index) => {
      const baseIndex = index * 9;
      const binding = this.bindIssue(issue);
      values.push(...binding);
      const params = binding.map((_, bindingIndex) => `$${baseIndex + bindingIndex + 1}`);
      placeholders.push(`(${params.join(', ')})`);
    });

    const text = `
      INSERT INTO issues (id, title, description, status, tags, impact, created_at, updated_at, metadata)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        tags = EXCLUDED.tags,
        impact = EXCLUDED.impact,
        created_at = LEAST(issues.created_at, EXCLUDED.created_at),
        updated_at = EXCLUDED.updated_at,
        metadata = COALESCE(issues.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb);
    `;

    await withBackoff(
      async () => {
        await this.pool.query(text, values);
      },
      {
        retries: this.maxRetries,
        onRetry: (error, attempt) => {
          this.logger.warn(`Retrying issue upsert (attempt ${attempt})`, error);
        },
      },
    );

    await Promise.all(
      issues.map((issue) => this.cache.set(createIssueCacheKey(issue.id), issue)),
    );

    await this.refreshMaterializedViews();
  }

  async deleteIssue(id: string): Promise<void> {
    await this.ensureInitialized();

    await withBackoff(
      async () => {
        await this.pool.query('DELETE FROM issues WHERE id = $1', [id]);
      },
      {
        retries: this.maxRetries,
        onRetry: (error, attempt) => {
          this.logger.warn(`Retrying issue delete (attempt ${attempt})`, error);
        },
      },
    );

    await this.cache.delete(createIssueCacheKey(id));
    await this.refreshMaterializedViews();
  }

  async getIssueById(id: string): Promise<Issue | null> {
    await this.ensureInitialized();
    const cacheKey = createIssueCacheKey(id);
    const cached = await this.cache.get<Issue>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await withBackoff<QueryResult<IssueRow>>(
      async () => this.pool.query('SELECT * FROM issues WHERE id = $1', [id]),
      {
        retries: this.maxRetries,
        onRetry: (error, attempt) => {
          this.logger.warn(`Retrying issue lookup (attempt ${attempt})`, error);
        },
      },
    );

    if (result.rowCount === 0) {
      return null;
    }

    const issue = mapRowToIssue(result.rows[0]);
    await this.cache.set(cacheKey, issue);
    return issue;
  }

  async listIssues(options: ListIssuesOptions = {}): Promise<Issue[]> {
    await this.ensureInitialized();
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const filters: string[] = [];
    const values: unknown[] = [limit, offset];
    let valueIndex = 3;

    if (options.status) {
      filters.push(`status = $${valueIndex}`);
      values.push(options.status);
      valueIndex += 1;
    }

    if (options.tags && options.tags.length > 0) {
      filters.push(`tags && $${valueIndex}`);
      values.push(options.tags);
      valueIndex += 1;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT *
      FROM issues
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await withBackoff<QueryResult<IssueRow>>(
      async () => this.pool.query(query, values),
      {
        retries: this.maxRetries,
        onRetry: (error, attempt) => {
          this.logger.warn(`Retrying issue list (attempt ${attempt})`, error);
        },
      },
    );

    const issues = this.mapIssues(result.rows);

    if (options.useCache !== false) {
      await Promise.all(
        issues.map((issue) => this.cache.set(createIssueCacheKey(issue.id), issue)),
      );
    }

    return issues;
  }

  async searchIssues(queryText: string, options: SearchIssuesOptions = {}): Promise<Issue[]> {
    await this.ensureInitialized();
    await this.refreshMaterializedViews();

    const limit = options.limit ?? 25;

    const sql = `
      WITH search_query AS (
        SELECT websearch_to_tsquery('english', $1) AS ts_query
      )
      SELECT i.*
      FROM issue_search_documents s
      CROSS JOIN search_query q
      JOIN issues i ON i.id = s.issue_id
      WHERE s.document @@ q.ts_query
      ORDER BY ts_rank(s.document, q.ts_query) DESC, i.updated_at DESC
      LIMIT $2
    `;

    const result = await withBackoff<QueryResult<IssueRow>>(
      async () => this.pool.query(sql, [queryText, limit]),
      {
        retries: this.maxRetries,
        onRetry: (error, attempt) => {
          this.logger.warn(`Retrying issue search (attempt ${attempt})`, error);
        },
      },
    );

    const issues = this.mapIssues(result.rows);
    await Promise.all(issues.map((issue) => this.cache.set(createIssueCacheKey(issue.id), issue)));
    return issues;
  }
}
