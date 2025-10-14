import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { SaveSchema, type Save } from '@sleeping-giants/shared/contracts.js';
import { parseWithSchema } from '../common/validation.js';
import { SavesRepository } from '../persistence/saves.repository.js';

@Controller('saves')
export class SavesController {
  constructor(
    @Inject(SavesRepository) private readonly savesRepository: SavesRepository,
  ) {}

  @Post()
  async upsert(@Body() body: unknown): Promise<Save> {
    const payload = (body ?? {}) as Partial<Save>;
    const candidate = {
      ...payload,
      savedAt: payload.savedAt ?? new Date().toISOString(),
    } satisfies Partial<Save>;
    const save: Save = parseWithSchema(SaveSchema, candidate);
    await this.savesRepository.upsert(save);
    return save;
  }

  @Get(':userId')
  async list(@Param('userId') userId: string): Promise<Save[]> {
    const saves = await this.savesRepository.listByUser(userId);
    return saves.map((save) => SaveSchema.parse(save));
  }
}
