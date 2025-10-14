import type { Issue } from '@sleeping-giants/shared/contracts.js';
import { IssueImpact, IssueStatus } from '@sleeping-giants/shared/contracts.js';
import { InMemoryIssueCache, createIssueCacheKey } from '@sleeping-giants/data/issues/index.js';

export interface IssueProvider {
  listIssues(limit: number): Promise<Issue[]>;
  searchIssues(tags: readonly string[], limit: number): Promise<Issue[]>;
}

export const ISSUE_PROVIDER = Symbol('ISSUE_PROVIDER');

const DEFAULT_ISSUES: Issue[] = [
  {
    id: 'issue-onboarding',
    title: 'Clarify onboarding milestones',
    description:
      'Founders are unsure which onboarding tasks unlock access to core collaboration features.',
    status: IssueStatus.OPEN,
    tags: ['ux', 'research'],
    impact: IssueImpact.HIGH,
    createdAt: '2024-01-05T10:00:00.000Z',
    updatedAt: '2024-01-05T10:00:00.000Z',
  },
  {
    id: 'issue-latency',
    title: 'Reduce workspace load latency',
    description:
      'Workspace dashboards occasionally take more than 4 seconds to load for EU customers.',
    status: IssueStatus.IN_PROGRESS,
    tags: ['performance', 'integration'],
    impact: IssueImpact.MEDIUM,
    createdAt: '2024-02-14T09:30:00.000Z',
    updatedAt: '2024-02-18T18:45:00.000Z',
  },
  {
    id: 'issue-accessibility',
    title: 'Improve accessibility of command palette',
    description:
      'Screen reader users report missing aria labels within the command palette search results.',
    status: IssueStatus.OPEN,
    tags: ['accessibility', 'ux'],
    impact: IssueImpact.HIGH,
    createdAt: '2024-03-02T08:15:00.000Z',
    updatedAt: '2024-03-11T12:05:00.000Z',
  },
];

const seedCache = async (cache: InMemoryIssueCache, issues: readonly Issue[]) => {
  await Promise.all(
    issues.map((issue) => cache.set(createIssueCacheKey(issue.id), issue)),
  );
};

export class InMemoryIssueProvider implements IssueProvider {
  private readonly cache: InMemoryIssueCache;
  private readonly issues: Issue[];

  constructor(issues: readonly Issue[] = DEFAULT_ISSUES) {
    this.cache = new InMemoryIssueCache(45);
    this.issues = [...issues];
    void seedCache(this.cache, this.issues);
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
