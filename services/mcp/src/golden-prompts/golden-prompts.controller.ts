import { Controller, Get, Post, Put, Delete, Body, Param, Headers, HttpException, HttpStatus, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GoldenPromptsService } from './golden-prompts.service';
import { CreateGoldenPromptDto, UpdateGoldenPromptDto, BulkCreateGoldenPromptsDto } from './dto/golden-prompt.dto';

@Controller('golden-prompts')
export class GoldenPromptsController {
  constructor(private readonly goldenPromptsService: GoldenPromptsService) {}

  @Get()
  async findAll(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.goldenPromptsService.findAll(tenantId);
  }

  @Get('by-use-case/:useCaseId')
  async findByUseCase(
    @Param('useCaseId') useCaseId: string,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.goldenPromptsService.findByUseCase(useCaseId, tenantId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.goldenPromptsService.findOne(id, tenantId);
  }

  @Post()
  async create(
    @Body() createGoldenPromptDto: CreateGoldenPromptDto,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.goldenPromptsService.create(createGoldenPromptDto, tenantId);
  }

  @Post('bulk')
  async bulkCreate(
    @Body() bulkCreateDto: BulkCreateGoldenPromptsDto,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.goldenPromptsService.bulkCreate(bulkCreateDto.prompts, tenantId);
  }

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    if (!file) {
      throw new HttpException('CSV file required', HttpStatus.BAD_REQUEST);
    }
    return this.goldenPromptsService.importFromCsv(file.buffer.toString(), tenantId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateGoldenPromptDto: UpdateGoldenPromptDto,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.goldenPromptsService.update(id, updateGoldenPromptDto, tenantId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.goldenPromptsService.remove(id, tenantId);
  }
}

