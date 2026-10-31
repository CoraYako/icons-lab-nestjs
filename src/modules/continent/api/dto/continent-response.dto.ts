import type { Continent } from '../../model/continent.entity.js';

export class ContinentResponseDto {
  readonly id!: string;
  readonly imageURL!: string | null;
  readonly name!: string;
  readonly countries!: string[];

  static fromEntity(
    continent: Continent,
    imageURL: string | null,
  ): ContinentResponseDto {
    return {
      id: continent.id,
      imageURL,
      name: continent.name,
      countries: (continent.countries ?? []).map((country) => country.name),
    };
  }
}
