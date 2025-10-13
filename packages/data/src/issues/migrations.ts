export const ISSUE_TABLE_SQL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  impact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);
`;

export const ISSUE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_issues_updated_at ON issues (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_tags ON issues USING GIN (tags);
`;

export const ISSUE_SEARCH_MATERIALIZED_VIEW_SQL = `
CREATE MATERIALIZED VIEW IF NOT EXISTS issue_search_documents AS
SELECT
  i.id AS issue_id,
  setweight(to_tsvector('english', coalesce(i.title, '')), 'A') ||
  setweight(to_tsvector('english', array_to_string(i.tags, ' ')), 'B') ||
  setweight(to_tsvector('english', coalesce(i.description, '')), 'C') AS document,
  i.updated_at
FROM issues i
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_search_documents_issue_id
  ON issue_search_documents (issue_id);

CREATE INDEX IF NOT EXISTS idx_issue_search_documents_document
  ON issue_search_documents USING GIN (document);
`;

export const ISSUE_ANALYTICS_VIEW_SQL = `
CREATE MATERIALIZED VIEW IF NOT EXISTS issue_activity_daily AS
SELECT
  date_trunc('day', created_at) AS bucket,
  COUNT(*) AS total_created,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
  COUNT(*) FILTER (WHERE status <> 'resolved') AS active,
  ARRAY(SELECT DISTINCT tag FROM UNNEST(tags) AS tag) AS tags_covered
FROM issues
GROUP BY bucket
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_activity_daily_bucket
  ON issue_activity_daily (bucket);
`;

export const ISSUE_MIGRATIONS = [
  ISSUE_TABLE_SQL,
  ISSUE_INDEXES_SQL,
  ISSUE_SEARCH_MATERIALIZED_VIEW_SQL,
  ISSUE_ANALYTICS_VIEW_SQL,
];
