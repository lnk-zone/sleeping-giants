import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

export const parseWithSchema = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
): z.infer<TSchema> => {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (hasErrors(error)) {
      throw new BadRequestException({
        message: 'Invalid request payload',
        details: error.errors,
      });
    }
    throw new BadRequestException('Invalid request payload');
  }
};

type ErrorWithDetails = { errors: unknown };

const hasErrors = (candidate: unknown): candidate is ErrorWithDetails =>
  typeof candidate === 'object' &&
  candidate !== null &&
  Object.prototype.hasOwnProperty.call(candidate, 'errors');
