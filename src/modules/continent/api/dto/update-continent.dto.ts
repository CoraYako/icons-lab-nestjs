import { CreateContinentDto } from './create-continent.dto.js';
import { PartialType } from '@nestjs/swagger';

export class UpdateContinentDto extends PartialType(CreateContinentDto, {
  skipNullProperties: false,
}) {}
