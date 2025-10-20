import { Module } from '@nestjs/common';
import { UseCasesController } from './use-cases.controller';
import { UseCasesService } from './use-cases.service';

@Module({
  controllers: [UseCasesController],
  providers: [UseCasesService],
  exports: [UseCasesService],
})
export class UseCasesModule {}

