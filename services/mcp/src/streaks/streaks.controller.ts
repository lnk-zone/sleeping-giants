import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { StreakEntrySchema, type StreakEntry } from '@sleeping-giants/shared/contracts.js';
import { z } from 'zod';
import { parseWithSchema } from '../common/validation.js';
import {
  InsufficientDwellError,
  StreaksRepository,
} from '../persistence/streaks.repository.js';
import { BadRequestException } from '@nestjs/common';

const StreakCompletionSchema = z.object({
  userId: z.string().min(1),
  dwellSeconds: z.number().nonnegative(),
  completedAt: z.string().datetime().optional(),
});

@Controller('streaks')
export class StreaksController {
  constructor(
    @Inject(StreaksRepository) private readonly streaksRepository: StreaksRepository,
  ) {}

  @Post('complete')
  async complete(@Body() body: unknown): Promise<StreakEntry> {
    const payload = parseWithSchema(StreakCompletionSchema, body);
    const completedDate = payload.completedAt ? new Date(payload.completedAt) : new Date();

    if (Number.isNaN(completedDate.getTime())) {
      throw new BadRequestException('completedAt must be a valid ISO date');
    }

    try {
      const entry = await this.streaksRepository.recordCompletion(
        payload.userId,
        completedDate,
        payload.dwellSeconds,
      );
      return StreakEntrySchema.parse(entry);
    } catch (error) {
      if (error instanceof InsufficientDwellError) {
        throw new BadRequestException({
          message: error.message,
          details: { dwellSeconds: error.dwellSeconds },
        });
      }
      throw error;
    }
  }

  @Get(':userId')
  async history(@Param('userId') userId: string): Promise<StreakEntry[]> {
    const history = await this.streaksRepository.history(userId);
    return history.map((entry) => StreakEntrySchema.parse(entry));
  }
}
