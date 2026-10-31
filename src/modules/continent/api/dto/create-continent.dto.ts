import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../../common/decorators/trim.decorator.js';

export class CreateContinentDto {
  @IsString()
  @Trim()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;
}
