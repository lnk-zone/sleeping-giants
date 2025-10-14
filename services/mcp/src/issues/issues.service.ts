import { Inject, Injectable } from '@nestjs/common';
import type { Issue } from '@sleeping-giants/shared/contracts.js';
import { ISSUE_PROVIDER, type IssueProvider } from './issue-provider.js';
import type { McpConfig } from '../config.js';
import { APP_CONFIG } from '../config.js';

@Injectable()
export class IssuesService {
  constructor(
    @Inject(ISSUE_PROVIDER) private readonly provider: IssueProvider,
    @Inject(APP_CONFIG) private readonly config: McpConfig,
  ) {}

  async list(limit?: number): Promise<Issue[]> {
    const cappedLimit = Math.max(1, Math.min(limit ?? this.config.builder.suggestionLimit, 25));
    return this.provider.listIssues(cappedLimit);
  }

  async findByTags(tags: readonly string[], limit?: number): Promise<Issue[]> {
    const cappedLimit = Math.max(1, Math.min(limit ?? this.config.builder.suggestionLimit, 25));
    return this.provider.searchIssues(tags, cappedLimit);
  }
}
