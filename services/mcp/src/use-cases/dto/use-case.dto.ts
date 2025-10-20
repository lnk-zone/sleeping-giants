import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';

export enum UseCasePriority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
}

export enum UseCaseStatus {
  ACTIVE = 'active',
  PLANNED = 'planned',
  ARCHIVED = 'archived',
}

export class CreateUseCaseDto {
  @IsEnum(UseCasePriority)
  priority: UseCasePriority;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  persona?: string;

  @IsString()
  @IsOptional()
  context?: string;

  @IsString()
  @IsOptional()
  success_criteria?: string;

  @IsEnum(UseCaseStatus)
  @IsOptional()
  status?: UseCaseStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tools_required?: string[];
}

export class UpdateUseCaseDto {
  @IsEnum(UseCasePriority)
  @IsOptional()
  priority?: UseCasePriority;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  persona?: string;

  @IsString()
  @IsOptional()
  context?: string;

  @IsString()
  @IsOptional()
  success_criteria?: string;

  @IsEnum(UseCaseStatus)
  @IsOptional()
  status?: UseCaseStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tools_required?: string[];
}

