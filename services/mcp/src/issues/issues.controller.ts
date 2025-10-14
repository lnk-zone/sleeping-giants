import { Controller, Get, Inject, Query } from '@nestjs/common';
import { IssueSchema } from '@sleeping-giants/shared/contracts.js';
import { IssuesService } from './issues.service.js';

const toNumber = (value: string | undefined): number | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

@Controller('issues')
export class IssuesController {
  constructor(@Inject(IssuesService) private readonly issuesService: IssuesService) {}

  @Get()
  async list(
    @Query('tags') tagsParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    const tags = tagsParam
      ?.split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const limit = toNumber(limitParam);
    const issues = await this.issuesService.findByTags(tags ?? [], limit);
    return issues.map((issue) => IssueSchema.parse(issue));
  }
}
