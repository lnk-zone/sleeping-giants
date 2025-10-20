import { Module } from '@nestjs/common';
import { GoldenPromptsController } from './golden-prompts.controller';
import { GoldenPromptsService } from './golden-prompts.service';

@Module({
  controllers: [GoldenPromptsController],
  providers: [GoldenPromptsService],
  exports: [GoldenPromptsService],
})
export class GoldenPromptsModule {}

