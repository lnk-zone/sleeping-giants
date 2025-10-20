import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateGoldenPromptDto, UpdateGoldenPromptDto } from './dto/golden-prompt.dto';
import { parse } from 'csv-parse/sync';

@Injectable()
export class GoldenPromptsService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async findAll(tenantId: string) {
    const { data, error } = await this.supabase
      .from('golden_prompts')
      .select('*, use_cases(title)')
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data;
  }

  async findByUseCase(useCaseId: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('golden_prompts')
      .select('*')
      .eq('use_case_id', useCaseId)
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: true });

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data;
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('golden_prompts')
      .select('*, use_cases(title)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }

    return data;
  }

  async create(createGoldenPromptDto: CreateGoldenPromptDto, tenantId: string) {
    const { data, error } = await this.supabase
      .from('golden_prompts')
      .insert({
        ...createGoldenPromptDto,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data;
  }

  async bulkCreate(prompts: CreateGoldenPromptDto[], tenantId: string) {
    const promptsWithTenant = prompts.map(prompt => ({
      ...prompt,
      tenant_id: tenantId,
    }));

    const { data, error } = await this.supabase
      .from('golden_prompts')
      .insert(promptsWithTenant)
      .select();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { created: data.length, prompts: data };
  }

  async importFromCsv(csvContent: string, tenantId: string) {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const prompts: CreateGoldenPromptDto[] = records.map((record: any) => ({
        priority: record.priority || 'P1',
        prompt_text: record.prompt_text || record.prompt || record.text,
        use_case_id: record.use_case_id || null,
        expected_outcome: record.expected_outcome || null,
        tags: record.tags ? record.tags.split(',').map((t: string) => t.trim()) : [],
      }));

      return this.bulkCreate(prompts, tenantId);
    } catch (error) {
      throw new HttpException(
        `CSV parsing error: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async update(id: string, updateGoldenPromptDto: UpdateGoldenPromptDto, tenantId: string) {
    const { data, error } = await this.supabase
      .from('golden_prompts')
      .update(updateGoldenPromptDto)
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
      .from('golden_prompts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { success: true };
  }
}

