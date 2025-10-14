import { Inject, Injectable } from '@nestjs/common';
import {
  BuilderModeOutputSchema,
  IssueImpact,
  IssueSchema,
  IssueStatus,
  type BuilderModeInput,
  type BuilderModeOutput,
  type Issue,
} from '@sleeping-giants/shared/contracts.js';
import { createHash } from 'node:crypto';
import { IssuesService } from '../issues/issues.service.js';
import { APP_CONFIG, type McpConfig } from '../config.js';

const CONSTRAINT_ACTIONS: Record<string, string> = {
  time: 'Sequence the roadmap into two-week focus blocks with measurable outcomes.',
  budget: 'Re-evaluate tooling spend and redirect savings toward the highest impact experiments.',
  compliance: 'Partner with legal to codify a compliance checklist for each release train.',
  talent: 'Stand up a guild of fractional experts to plug capability gaps for this initiative.',
  data: 'Instrument critical funnels and publish a narrative dashboard to guide execution.',
};

const sanitizeTags = (tags: readonly string[]): readonly string[] =>
  Array.from(new Set(tags.map((tag) => tag.toLowerCase())));

const canonicalizeInput = (input: BuilderModeInput): BuilderModeInput => ({
  ...input,
  constraints: [...input.constraints].sort(),
  tags: [...input.tags].sort(),
});

const hashInput = (input: BuilderModeInput): string => {
  const canonical = canonicalizeInput(input);
  const payload = JSON.stringify(canonical);
  return createHash('sha256').update(payload).digest('hex');
};

const selectImpact = (hash: string): IssueImpact => {
  const impacts = [IssueImpact.HIGH, IssueImpact.MEDIUM, IssueImpact.LOW];
  const index = parseInt(hash.slice(0, 2), 16) % impacts.length;
  return impacts[index];
};

const deriveConfidence = (hash: string): number => {
  const sample = parseInt(hash.slice(2, 6), 16);
  const normalized = 0.55 + (sample % 36) / 100;
  return Number(normalized.toFixed(2));
};

const buildSummary = (input: BuilderModeInput): string =>
  [
    `Focus the ${input.industry.toLowerCase()} team (${input.stage.toLowerCase()} stage) on "${input.goal}"`,
    `for ${input.targetCustomer.toLowerCase()}.`,
    input.context ? `Context: ${input.context}` : undefined,
  ]
    .filter(Boolean)
    .join(' ');

const buildConstraintActions = (input: BuilderModeInput): string[] => {
  const actions = input.constraints
    .map((constraint) => CONSTRAINT_ACTIONS[constraint.toLowerCase()]?.trim())
    .filter(Boolean);

  return actions.length > 0
    ? actions
    : ['Create a cross-functional checkpoint to unblock decision velocity each week.'];
};

const buildTagAction = (tags: readonly string[]): string => {
  if (tags.length === 0) {
    return 'Catalogue open issues and align on the most valuable customer problems.';
  }
  return `Run discovery spikes around ${tags.map((tag) => `#${tag}`).join(', ')} to surface delivery risks.`;
};

const fallbackIssue = (input: BuilderModeInput, hash: string, index: number): Issue => {
  const baseTimestamp = new Date(Date.now() - index * 60_000).toISOString();
    return IssueSchema.parse({
      id: `synthetic-${hash.slice(0, 8)}-${index}`,
      title: `Accelerate progress on ${input.goal.toLowerCase()}`,
      description: `Drive outcomes for ${input.targetCustomer.toLowerCase()} by focusing on ${
        input.tags[index % input.tags.length] ?? 'priority signals'
      }.`,
      status: IssueStatus.OPEN,
      tags: sanitizeTags(input.tags).slice(0, 3),
      impact: selectImpact(hash),
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
    });
};

@Injectable()
export class BuilderService {
  constructor(
    @Inject(IssuesService) private readonly issuesService: IssuesService,
    @Inject(APP_CONFIG) private readonly config: McpConfig,
  ) {}

  async generatePlan(input: BuilderModeInput): Promise<BuilderModeOutput> {
    const normalizedInput = canonicalizeInput(input);
    const hash = hashInput(normalizedInput);
    const suggestionLimit = this.config.builder.suggestionLimit;
    const suggestedIssues = await this.issuesService.findByTags(
      sanitizeTags(normalizedInput.tags),
      suggestionLimit,
    );

    const issues: Issue[] = suggestedIssues.length > 0
      ? suggestedIssues
      : Array.from({ length: suggestionLimit }, (_, index) =>
          fallbackIssue(normalizedInput, hash, index),
        );

    const uniqueIssues = issues.slice(0, suggestionLimit);

    const keyActions = [
      `Validate the goal "${normalizedInput.goal}" with ${normalizedInput.targetCustomer.toLowerCase()} interviews.`,
      ...buildConstraintActions(normalizedInput),
      buildTagAction(normalizedInput.tags),
    ]
      .filter(Boolean)
      .slice(0, 4);

    const output: BuilderModeOutput = {
      id: `builder-${hash.slice(0, 12)}`,
      summary: buildSummary(normalizedInput),
      keyActions,
      suggestedIssues: uniqueIssues.map((issue) => IssueSchema.parse(issue)),
      confidence: deriveConfidence(hash),
      impact: selectImpact(hash),
      references: [...this.config.builder.defaultReferences],
    };

    return BuilderModeOutputSchema.parse(output);
  }
}
