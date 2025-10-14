import type { Issue } from '@sleeping-giants/shared/contracts.js';
import { InMemoryIssueCache, createIssueCacheKey } from '@sleeping-giants/data/issues/index.js';

export interface IssueProvider {
  listIssues(limit: number): Promise<Issue[]>;
  searchIssues(tags: readonly string[], limit: number): Promise<Issue[]>;
}

export const ISSUE_PROVIDER = Symbol('ISSUE_PROVIDER');

const seedCache = async (cache: InMemoryIssueCache, issues: readonly Issue[]) => {
  await Promise.all(
    issues.map((issue) => cache.set(createIssueCacheKey(issue.id), issue)),
  );
};

export class InMemoryIssueProvider implements IssueProvider {
  private readonly cache: InMemoryIssueCache;
  private readonly issues: Issue[];

  constructor(issues: readonly Issue[] = []) {
    this.cache = new InMemoryIssueCache(45);
    this.issues = [...issues];
    if (this.issues.length > 0) {
      void seedCache(this.cache, this.issues);
    }
  }

  async listIssues(limit: number): Promise<Issue[]> {
    return this.issues.slice(0, limit);
  }

  async searchIssues(tags: readonly string[], limit: number): Promise<Issue[]> {
    if (tags.length === 0) {
      return this.listIssues(limit);
    }

    const lowerTags = new Set(tags.map((tag) => tag.toLowerCase()));
    const matches = this.issues.filter((issue) =>
      issue.tags.some((tag) => lowerTags.has(tag.toLowerCase())),
    );
    return matches.slice(0, limit);
  }
}
