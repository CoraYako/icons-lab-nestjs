import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldError {
  @ApiProperty({ example: 'name' })
  readonly field!: string;

  @ApiProperty({ example: 'name should not be empty' })
  readonly message!: string;
}

export class ProblemDetail {
  @ApiProperty({
    description:
      'Identificador estable del error. Es lo que evalúa el cliente.',
    example: '/problems/validation-error',
  })
  readonly type!: string;

  @ApiProperty({ example: 'Validation failed' })
  readonly title!: string;

  @ApiProperty({ example: 400 })
  readonly status!: number;

  @ApiProperty({ example: 'The request contains 1 invalid field.' })
  readonly detail!: string;

  @ApiProperty({ example: '/api/v1/continents' })
  readonly instance!: string;

  @ApiProperty({ format: 'date-time', example: '2026-10-31T15:00:00.000Z' })
  readonly timestamp!: string;

  @ApiPropertyOptional({
    type: [FieldError],
    description: 'Solo en errores de validación (400).',
  })
  readonly errors?: FieldError[];
}
