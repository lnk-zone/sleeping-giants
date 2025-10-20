import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateUseCaseDto, UpdateUseCaseDto } from './dto/use-case.dto';

@Injectable()
export class UseCasesService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async findAll(tenantId: string) {
    const { data, error } = await this.supabase
      .from('use_cases')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data;
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('use_cases')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }

    return data;
  }

  async create(createUseCaseDto: CreateUseCaseDto, tenantId: string) {
    const { data, error } = await this.supabase
      .from('use_cases')
      .insert({
        ...createUseCaseDto,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data;
  }

  async update(id: string, updateUseCaseDto: UpdateUseCaseDto, tenantId: string) {
    const { data, error } = await this.supabase
      .from('use_cases')
      .update(updateUseCaseDto)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data;
  }

  async remove(id: string, tenantId: string) {
    const { error } = await this.supabase
      .from('use_cases')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { success: true };
  }
}

