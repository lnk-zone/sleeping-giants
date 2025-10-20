import { IsString, IsEnum, IsArray, IsOptional, IsUUID } from 'class-validator';

export enum GoldenPromptPriority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
}

export class CreateGoldenPromptDto {
  @IsEnum(GoldenPromptPriority)
  priority: GoldenPromptPriority;

  @IsString()
  prompt_text: string;

  @IsUUID()
  @IsOptional()
  use_case_id?: string;

  @IsString()
  @IsOptional()
  expected_outcome?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateGoldenPromptDto {
  @IsEnum(GoldenPromptPriority)
  @IsOptional()
  priority?: GoldenPromptPriority;

  @IsString()
  @IsOptional()
  prompt_text?: string;

  @IsUUID()
  @IsOptional()
  use_case_id?: string;

  @IsString()
  @IsOptional()
  expected_outcome?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class BulkCreateGoldenPromptsDto {
  @IsArray()
  prompts: CreateGoldenPromptDto[];
}

