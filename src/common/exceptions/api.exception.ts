import { HttpException } from '@nestjs/common';
import { ApiErrorType } from './api-error-type.js';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiException extends HttpException {
  readonly errorType: ApiErrorType;
  readonly errors?: FieldError[];

  constructor(errorType: ApiErrorType, detail: string, errors?: FieldError[]) {
    super(detail, errorType.status);
    this.errorType = errorType;
    this.errors = errors;
  }

  static badRequest(detail: string, errors?: FieldError[]): ApiException {
    return new ApiException(ApiErrorType.VALIDATION_ERROR, detail, errors);
  }

  static notFound(detail: string): ApiException {
    return new ApiException(ApiErrorType.RESOURCE_NOT_FOUND, detail);
  }

  static conflict(detail: string): ApiException {
    return new ApiException(ApiErrorType.DUPLICATED_RESOURCE, detail);
  }

  static unsupportedMedia(detail: string): ApiException {
    return new ApiException(ApiErrorType.UNSUPPORTED_MEDIA, detail);
  }

  static internalError(detail: string): ApiException {
    return new ApiException(ApiErrorType.INTERNAL_ERROR, detail);
  }
}
