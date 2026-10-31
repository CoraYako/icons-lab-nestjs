import { ParseUUIDPipe } from '@nestjs/common';
import { ApiErrorType } from '../exceptions/api-error-type.js';
import { ApiException } from '../exceptions/api.exception.js';

export const UUID_V4 = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () =>
    new ApiException(
      ApiErrorType.INVALID_IDENTIFIER,
      'The id must be a valid UUID v4.',
    ),
});
