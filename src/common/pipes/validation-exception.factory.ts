import type { ValidationError } from '@nestjs/common';
import { ApiException, type FieldError } from '../exceptions/api.exception.js';

const toFieldErrors = (errors: ValidationError[], parent = ''): FieldError[] =>
  errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...own, ...toFieldErrors(error.children ?? [], field)];
  });

export const validationExceptionFactory = (
  errors: ValidationError[],
): ApiException => {
  const fieldErrors = toFieldErrors(errors);
  return ApiException.badRequest(
    `The request contains ${fieldErrors.length} invalid field(s).`,
    fieldErrors,
  );
};
