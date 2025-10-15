import { describe, expect, it } from 'vitest';
import {
  ISSUE_SEARCH_WEIGHTS,
  buildIssueRankSql,
  buildIssueSearchVectorSql,
} from '../src/search/issues.js';

describe('issue search helpers', () => {
  it('uses tiered weights for title, tags, and body', () => {
    expect(ISSUE_SEARCH_WEIGHTS.title).toBe('A');
    expect(ISSUE_SEARCH_WEIGHTS.tags).toBe('B');
    expect(ISSUE_SEARCH_WEIGHTS.body).toBe('C');
  });

  it('generates the same vector expression used in the migration', () => {
    const sql = buildIssueSearchVectorSql('issues');
    expect(sql).toBe(
      "setweight(to_tsvector('english', coalesce(issues.title, '')), 'A') || " +
        "setweight(to_tsvector('english', coalesce(array_to_string(issues.tags, ' '), '')), 'B') || " +
        "setweight(to_tsvector('english', coalesce(issues.body_plain, '')), 'C')",
    );
  });

  it('generates a rank expression that prioritizes weighted vectors', () => {
    expect(buildIssueRankSql('$1')).toBe(
      "ts_rank_cd(search_vector, plainto_tsquery('english', $1), 32)",
    );
    expect(buildIssueRankSql('$2', 'issues.search_vector')).toBe(
      "ts_rank_cd(issues.search_vector, plainto_tsquery('english', $2), 32)",
    );
  });
});
