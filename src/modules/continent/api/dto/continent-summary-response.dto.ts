import { Continent } from '../../model/continent.entity.js';

export class ContinentSummaryResponseDto {
  readonly id!: string;
  readonly imageURL!: string | null;
  readonly name!: string;
  
  static fromEntity(continent: Continent): ContinentSummaryResponseDto {
    return {
      id: continent.id,
      imageURL: continent.imageKey,
      name: continent.name
    };
  }
}