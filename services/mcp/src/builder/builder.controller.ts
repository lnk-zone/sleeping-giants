import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  BuilderModeInputSchema,
  type BuilderModeInput,
  type BuilderModeOutput,
} from '@sleeping-giants/shared/contracts.js';
import { parseWithSchema } from '../common/validation.js';
import { BuilderService } from './builder.service.js';

@Controller('builder-mode')
export class BuilderController {
  constructor(
    @Inject(BuilderService) private readonly builderService: BuilderService,
  ) {}

  @Post()
  async generate(@Body() body: unknown): Promise<BuilderModeOutput> {
    const input = parseWithSchema(BuilderModeInputSchema, body) as BuilderModeInput;
    return this.builderService.generatePlan(input);
  }
}
