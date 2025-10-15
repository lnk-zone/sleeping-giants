export const ISSUE_SEARCH_WEIGHTS = {
  title: 'A',
  tags: 'B',
  body: 'C',
} as const;

const sanitizeAlias = (alias?: string): string => {
  if (!alias) {
    return '';
  }
  return alias.endsWith('.') ? alias : `${alias}.`;
};

export const buildIssueSearchVectorSql = (alias?: string): string => {
  const prefix = sanitizeAlias(alias);
  return [
    `setweight(to_tsvector('english', coalesce(${prefix}title, '')), '${ISSUE_SEARCH_WEIGHTS.title}')`,
    `setweight(to_tsvector('english', coalesce(array_to_string(${prefix}tags, ' '), '')), '${ISSUE_SEARCH_WEIGHTS.tags}')`,
    `setweight(to_tsvector('english', coalesce(${prefix}body_plain, '')), '${ISSUE_SEARCH_WEIGHTS.body}')`,
  ].join(' || ');
};

export const buildIssueRankSql = (
  queryParam: string,
  vector: string = 'search_vector',
): string =>
  `ts_rank_cd(${vector}, plainto_tsquery('english', ${queryParam}), 32)`;
