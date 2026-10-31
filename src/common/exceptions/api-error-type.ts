import { HttpStatus } from '@nestjs/common';

export const ApiErrorType = {
  VALIDATION_ERROR: {
    type: '/problems/validation-error',
    title: 'Validation failed',
    status: HttpStatus.BAD_REQUEST,
  },
  MALFORMED_REQUEST: {
    type: '/problems/malformed-request',
    title: 'Malformed request',
    status: HttpStatus.BAD_REQUEST,
  },
  INVALID_IDENTIFIER: {
    type: '/problems/invalid-identifier',
    title: 'Invalid identifier',
    status: HttpStatus.BAD_REQUEST,
  },
  UNAUTHORIZED: {
    type: '/problems/unauthorized',
    title: 'Unauthorized',
    status: HttpStatus.UNAUTHORIZED,
  },
  FORBIDDEN: {
    type: '/problems/forbidden',
    title: 'Forbidden',
    status: HttpStatus.FORBIDDEN,
  },
  RESOURCE_NOT_FOUND: {
    type: '/problems/resource-not-found',
    title: 'Resource not found',
    status: HttpStatus.NOT_FOUND,
  },
  DUPLICATED_RESOURCE: {
    type: '/problems/duplicated-resource',
    title: 'Duplicated resource',
    status: HttpStatus.CONFLICT,
  },
  PAYLOAD_TOO_LARGE: {
    type: '/problems/payload-too-large',
    title: 'Payload too large',
    status: HttpStatus.PAYLOAD_TOO_LARGE,
  },
  UNSUPPORTED_MEDIA: {
    type: '/problems/unsupported-media',
    title: 'Unsupported media type',
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  },
  INTERNAL_ERROR: {
    type: '/problems/internal-error',
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
} as const;

export type ApiErrorType = (typeof ApiErrorType)[keyof typeof ApiErrorType];
