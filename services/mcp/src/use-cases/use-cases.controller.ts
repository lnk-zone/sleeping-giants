import { Controller, Get, Post, Put, Delete, Body, Param, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { UseCasesService } from './use-cases.service';
import { CreateUseCaseDto, UpdateUseCaseDto } from './dto/use-case.dto';

@Controller('use-cases')
export class UseCasesController {
  constructor(private readonly useCasesService: UseCasesService) {}

  @Get()
  async findAll(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.useCasesService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.useCasesService.findOne(id, tenantId);
  }

  @Post()
  async create(
    @Body() createUseCaseDto: CreateUseCaseDto,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.useCasesService.create(createUseCaseDto, tenantId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUseCaseDto: UpdateUseCaseDto,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.useCasesService.update(id, updateUseCaseDto, tenantId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string
  ) {
    if (!tenantId) {
      throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
    }
    return this.useCasesService.remove(id, tenantId);
  }
}

