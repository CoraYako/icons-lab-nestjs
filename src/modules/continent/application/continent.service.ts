import { Injectable } from '@nestjs/common';
import { CreateContinentDto } from '../api/dto/create-continent.dto.js';
import { UpdateContinentDto } from '../api/dto/update-continent.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Continent } from '../model/continent.entity.js';
import { Repository } from 'typeorm';
import { ContinentResponseDto } from '../api/dto/continent-response.dto.js';
import { ContinentSummaryResponseDto } from '../api/dto/continent-summary-response.dto.js';
import { ApiException } from '../../../common/exceptions/api.exception.js';
import { ImageStorageService } from '../../../storage/image-storage.service.js';

@Injectable()
export class ContinentService {
  constructor(
    @InjectRepository(Continent)
    private readonly continentRepository: Repository<Continent>,
    private readonly imageStorageService: ImageStorageService,
  ) {}

  async create(request: CreateContinentDto): Promise<ContinentResponseDto> {
    const exists = await this.continentRepository.existsBy({
      name: request.name,
    });
    if (exists) {
      throw ApiException.conflict(`Continent ${request.name} already exists`);
    }
    const continent = this.continentRepository.create({ name: request.name });
    const saved = await this.continentRepository.save(continent);
    return ContinentResponseDto.fromEntity(saved, null);
  }

  async list(): Promise<ContinentSummaryResponseDto[]> {
    const continents = await this.continentRepository.find({
      order: { name: 'ASC' },
    });
    return continents.map(ContinentSummaryResponseDto.fromEntity);
  }

  async getById(id: string): Promise<ContinentResponseDto> {
    const continent = await this.continentRepository.findOne({
      where: { id },
      relations: { countries: true },
    });
    if (!continent) {
      throw ApiException.notFound(`Continent with id ${id} not found`);
    }
    return ContinentResponseDto.fromEntity(
      continent,
      this.imageStorageService.toPublicUrl(continent.imageKey),
    );
  }

  async update(
    id: string,
    request: UpdateContinentDto,
  ): Promise<ContinentResponseDto> {
    const continent = await this.continentRepository.findOneBy({ id });
    if (!continent) {
      throw ApiException.notFound(`Continent with id ${id} not found`);
    }

    if (continent.name === request.name) {
      throw ApiException.conflict(
        `There is already a continent named ${request.name}`,
      );
    }

    this.continentRepository.merge(continent, request);
    return ContinentResponseDto.fromEntity(
      continent,
      this.imageStorageService.toPublicUrl(continent.imageKey),
    );
  }

  async replaceImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<ContinentResponseDto> {
    const continent = await this.continentRepository.findOne({
      where: { id },
      relations: { countries: true },
    });
    if (!continent) {
      throw ApiException.notFound(`Continent with id ${id} not found`);
    }
    const previousKey = continent.imageKey;

    const prefix = `continent/${id}`;
    const key = await this.imageStorageService.buildKey(prefix, file);

    if (continent.imageKey === key) {
      return ContinentResponseDto.fromEntity(
        continent,
        this.imageStorageService.toPublicUrl(key),
      );
    }

    const newKey = await this.imageStorageService.upload(key, file);
    continent.imageKey = newKey;

    let saved: Continent;
    try {
      saved = await this.continentRepository.save(continent);
    } catch (error) {
      await this.imageStorageService.remove(newKey);
      throw error;
    }

    if (previousKey) {
      await this.imageStorageService.remove(previousKey);
    }

    return ContinentResponseDto.fromEntity(
      saved,
      this.imageStorageService.toPublicUrl(continent.imageKey),
    );
  }
}
