import { ApiException, type FieldError } from './api.exception.js';
import { ApiErrorType } from './api-error-type.js';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';

interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: FieldError[];
}

const TYPE_BY_STATUS = new Map<number, ApiErrorType>([
  [400, ApiErrorType.MALFORMED_REQUEST],
  [401, ApiErrorType.UNAUTHORIZED],
  [403, ApiErrorType.FORBIDDEN],
  [404, ApiErrorType.RESOURCE_NOT_FOUND],
  [409, ApiErrorType.DUPLICATED_RESOURCE],
  [413, ApiErrorType.PAYLOAD_TOO_LARGE],
  [415, ApiErrorType.UNSUPPORTED_MEDIA],
]);

const PG_UNIQUE_VIOLATION = '23505';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const problem = this.toProblem(exception);

    response
      .status(problem.status)
      .type('application/problem+json')
      .json({
        type: problem.type,
        title: problem.title,
        status: problem.status,
        detail: problem.detail,
        instance: request.originalUrl,
        timestamp: new Date().toISOString(),
        ...(problem.errors && { errors: problem.errors }),
      });
  }

  private toProblem(exception: unknown): Problem {
    if (exception instanceof ApiException) {
      return {
        type: exception.errorType.type,
        title: exception.errorType.title,
        status: exception.errorType.status,
        detail: exception.message,
        errors: exception.errors,
      };
    }

    if (
      exception instanceof QueryFailedError &&
      (exception.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
    ) {
      const { type, title, status } = ApiErrorType.DUPLICATED_RESOURCE;
      return {
        type,
        title,
        status,
        detail: 'A resource with that value already exists.',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorType = TYPE_BY_STATUS.get(status);
      return {
        type: errorType?.type ?? 'about:blank',
        title: errorType?.title ?? STATUS_CODES[status] ?? 'Error',
        status,
        detail: exception.message,
      };
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    const { type, title, status } = ApiErrorType.INTERNAL_ERROR;
    return { type, title, status, detail: 'An unexpected error occurred.' };
  }
}
